import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
  type AppStateStatus,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import QRCode from "react-native-qrcode-svg";
import Svg, { Circle } from "react-native-svg";

import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { theme } from "../../../constants/theme";
import type { EventsStackParamList, ProfileStackParamList } from "../../../navigation/types";
import { getEventAttendanceQrToken } from "../services/eventCheckin.service";
import type { EventAttendanceQrToken } from "../types";
import {
  resolveQrRefreshDelayMs,
  resolveQrTokenError,
  resolveQrWindowRetryDelayMs,
  shouldRefreshQrOnAppStateTransition,
} from "../utils/eventCheckinUi";
import { formatEventTimeLabel } from "../utils/eventTimezone";

type Props = NativeStackScreenProps<
  EventsStackParamList & ProfileStackParamList,
  "EventAttendanceQrScreen"
>;

const COUNTDOWN_SIZE = 38;
const COUNTDOWN_STROKE = 3;
const COUNTDOWN_RADIUS = (COUNTDOWN_SIZE - COUNTDOWN_STROKE) / 2;
const COUNTDOWN_CIRCUMFERENCE = 2 * Math.PI * COUNTDOWN_RADIUS;

export function EventAttendanceQrScreen({ navigation, route }: Props) {
  const { eventId, eventTitle, timezone } = route.params;
  const [qrToken, setQrToken] = useState<EventAttendanceQrToken | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const loadQrToken = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);

    try {
      const result = await getEventAttendanceQrToken(eventId);
      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current ||
        appStateRef.current !== "active"
      ) {
        return;
      }
      setQrToken(result);
      setError(null);
    } catch (nextError) {
      if (
        !mountedRef.current ||
        requestId !== requestIdRef.current ||
        appStateRef.current !== "active"
      ) {
        return;
      }
      setQrToken(null);
      setError(nextError);
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [eventId]);

  useEffect(() => {
    mountedRef.current = true;
    void loadQrToken();

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [loadQrToken]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previous = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState !== "active") {
        requestIdRef.current += 1;
        setQrToken(null);
        setIsLoading(true);
        return;
      }

      if (shouldRefreshQrOnAppStateTransition(previous, nextState)) {
        void loadQrToken();
      }
    });

    return () => subscription.remove();
  }, [loadQrToken]);

  useEffect(() => {
    if (!qrToken) {
      setSecondsRemaining(0);
      return;
    }

    const updateCountdown = () => {
      const nextSeconds = Math.max(
        0,
        Math.ceil((new Date(qrToken.expiresAt).getTime() - Date.now()) / 1_000),
      );
      setSecondsRemaining(nextSeconds);
      if (nextSeconds === 0) {
        setQrToken((current) => (current?.token === qrToken.token ? null : current));
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1_000);
    const refreshTimer = setTimeout(
      () => void loadQrToken(),
      resolveQrRefreshDelayMs(qrToken),
    );

    return () => {
      clearInterval(interval);
      clearTimeout(refreshTimer);
    };
  }, [loadQrToken, qrToken]);

  useEffect(() => {
    if (!error) {
      return;
    }

    const retryDelay = resolveQrWindowRetryDelayMs(error);
    if (retryDelay == null) {
      return;
    }

    const timer = setTimeout(() => void loadQrToken(), retryDelay);
    return () => clearTimeout(timer);
  }, [error, loadQrToken]);

  const countdownProgress = qrToken
    ? Math.min(1, secondsRemaining / Math.max(1, qrToken.expiresInSeconds))
    : 0;
  const errorPresentation = error ? resolveQrTokenError(error, timezone) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Geri"
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons color={theme.colors.textPrimary} name="arrow-back" size={24} />
        </Pressable>
        <View style={styles.headerText}>
          <AppText variant="sectionTitle">Giriş QR'ım</AppText>
          <AppText numberOfLines={1} variant="caption">
            {eventTitle}
          </AppText>
        </View>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.content}>
        {qrToken ? (
          <>
            {qrToken.alreadyCheckedIn ? (
              <View style={styles.checkedInBanner}>
                <Ionicons color="#15803D" name="checkmark-circle" size={22} />
                <AppText style={styles.checkedInText} variant="label">
                  Girişin yapıldı ✓
                  {qrToken.checkedInAt
                    ? ` ${formatEventTimeLabel(qrToken.checkedInAt, timezone)}`
                    : ""}
                </AppText>
              </View>
            ) : null}

            <Card style={styles.qrCard}>
              <View style={styles.countdown}>
                <Svg height={COUNTDOWN_SIZE} width={COUNTDOWN_SIZE}>
                  <Circle
                    cx={COUNTDOWN_SIZE / 2}
                    cy={COUNTDOWN_SIZE / 2}
                    fill="none"
                    r={COUNTDOWN_RADIUS}
                    stroke={theme.colors.border}
                    strokeWidth={COUNTDOWN_STROKE}
                  />
                  <Circle
                    cx={COUNTDOWN_SIZE / 2}
                    cy={COUNTDOWN_SIZE / 2}
                    fill="none"
                    r={COUNTDOWN_RADIUS}
                    rotation="-90"
                    origin={`${COUNTDOWN_SIZE / 2}, ${COUNTDOWN_SIZE / 2}`}
                    stroke={theme.colors.primary}
                    strokeDasharray={`${COUNTDOWN_CIRCUMFERENCE} ${COUNTDOWN_CIRCUMFERENCE}`}
                    strokeDashoffset={COUNTDOWN_CIRCUMFERENCE * (1 - countdownProgress)}
                    strokeLinecap="round"
                    strokeWidth={COUNTDOWN_STROKE}
                  />
                </Svg>
                <AppText style={styles.countdownText} variant="caption">
                  {secondsRemaining}
                </AppText>
              </View>

              <View style={styles.qrSurface}>
                <QRCode
                  backgroundColor="#FFFFFF"
                  color="#111827"
                  quietZone={12}
                  size={220}
                  value={qrToken.token}
                />
              </View>
              <AppText style={styles.scanHint} variant="bodyMuted">
                Organizatörün girişte bu kodu tarasın.
              </AppText>
              {isLoading ? (
                <View style={styles.refreshingRow}>
                  <ActivityIndicator color={theme.colors.primary} size="small" />
                  <AppText variant="caption">QR yenileniyor...</AppText>
                </View>
              ) : null}
            </Card>
          </>
        ) : isLoading ? (
          <Card style={styles.stateCard}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <AppText variant="bodyMuted">Giriş QR kodun hazırlanıyor...</AppText>
          </Card>
        ) : errorPresentation ? (
          <Card style={styles.stateCard}>
            <Ionicons
              color={
                errorPresentation.kind === "closed"
                  ? theme.colors.muted
                  : theme.colors.primary
              }
              name={
                errorPresentation.kind === "closed"
                  ? "lock-closed-outline"
                  : "time-outline"
              }
              size={48}
            />
            <AppText style={styles.stateTitle} variant="sectionTitle">
              {errorPresentation.title}
            </AppText>
            <AppText style={styles.stateSubtitle} variant="bodyMuted">
              {errorPresentation.subtitle}
            </AppText>
            {errorPresentation.kind === "error" ? (
              <Pressable onPress={() => void loadQrToken()} style={styles.retryButton}>
                <AppText style={styles.retryText} variant="label">
                  Tekrar dene
                </AppText>
              </Pressable>
            ) : null}
          </Card>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 64,
    paddingHorizontal: theme.spacing.md,
  },
  headerButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerText: {
    alignItems: "center",
    flex: 1,
  },
  content: {
    flex: 1,
    gap: theme.spacing.md,
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  checkedInBanner: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    padding: theme.spacing.md,
  },
  checkedInText: {
    color: "#15803D",
  },
  qrCard: {
    alignItems: "center",
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  qrSurface: {
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.sm,
  },
  countdown: {
    alignItems: "center",
    height: COUNTDOWN_SIZE,
    justifyContent: "center",
    position: "absolute",
    right: theme.spacing.md,
    top: theme.spacing.md,
    width: COUNTDOWN_SIZE,
  },
  countdownText: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
    position: "absolute",
  },
  scanHint: {
    textAlign: "center",
  },
  refreshingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  stateCard: {
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xxl,
  },
  stateTitle: {
    textAlign: "center",
  },
  stateSubtitle: {
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  retryText: {
    color: "#FFFFFF",
  },
});
