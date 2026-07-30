import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  CameraView,
  type BarcodeScanningResult,
  useCameraPermissions,
} from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "../../../components/ui/AppText";
import { Avatar } from "../../../components/ui/Avatar";
import { theme } from "../../../constants/theme";
import type { EventsStackParamList, ProfileStackParamList } from "../../../navigation/types";
import { checkInEventAttendee } from "../services/eventCheckin.service";
import type { EventCheckinResult } from "../types";
import {
  resolveCheckinResultPresentation,
  resolveCheckinScanError,
  shouldProcessQrScan,
  type LastProcessedQr,
} from "../utils/eventCheckinUi";
import { formatEventTimeLabel } from "../utils/eventTimezone";

type Props = NativeStackScreenProps<
  EventsStackParamList & ProfileStackParamList,
  "EventQrScannerScreen"
>;

type ScanOutcome =
  | { kind: "result"; value: EventCheckinResult }
  | { kind: "error"; message: string };

export function EventQrScannerScreen({ navigation, route }: Props) {
  const { eventId, eventTitle, timezone } = route.params;
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [isAppActive, setIsAppActive] = useState(
    () => AppState.currentState === "active",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const lastProcessedRef = useRef<LastProcessedQr | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain) {
      return;
    }
    void requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      setIsAppActive(nextState === "active");
    });
    return () => subscription.remove();
  }, []);

  const handleBarcodeScanned = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      const nowMs = Date.now();
      if (
        submittingRef.current ||
        outcome ||
        !shouldProcessQrScan(lastProcessedRef.current, data, nowMs)
      ) {
        return;
      }

      lastProcessedRef.current = { token: data.trim(), processedAtMs: nowMs };
      submittingRef.current = true;
      setIsSubmitting(true);

      try {
        const result = await checkInEventAttendee(eventId, data.trim());
        setOutcome({ kind: "result", value: result });
      } catch (error) {
        setOutcome({ kind: "error", message: resolveCheckinScanError(error) });
      } finally {
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [eventId, outcome],
  );

  const scanNext = useCallback(() => {
    if (lastProcessedRef.current) {
      lastProcessedRef.current = {
        ...lastProcessedRef.current,
        processedAtMs: Date.now(),
      };
    }
    setOutcome(null);
  }, []);

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, theme.spacing.md) }]}>
      <Pressable
        accessibilityLabel="QR taramayı kapat"
        onPress={() => navigation.goBack()}
        style={styles.headerButton}
      >
        <Ionicons color="#FFFFFF" name="close" size={28} />
      </Pressable>
      <View style={styles.headerText}>
        <AppText style={styles.headerTitle} variant="sectionTitle">
          QR Tara
        </AppText>
        <AppText numberOfLines={1} style={styles.headerSubtitle} variant="caption">
          {eventTitle}
        </AppText>
      </View>
      <View style={styles.headerButton} />
    </View>
  );

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#FFFFFF" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.permissionState}>
          <Ionicons color="rgba(255,255,255,0.6)" name="camera-outline" size={64} />
          <AppText style={styles.permissionTitle} variant="sectionTitle">
            Kamera izni gerekli
          </AppText>
          <AppText style={styles.permissionText} variant="body">
            Katılımcıların giriş QR kodlarını taramak için kameraya erişim izni
            vermelisin.
          </AppText>
          <Pressable
            accessibilityLabel={
              permission.canAskAgain ? "Kamera izni ver" : "Kamera izni için ayarları aç"
            }
            onPress={() =>
              permission.canAskAgain
                ? void requestPermission()
                : void Linking.openSettings()
            }
            style={styles.permissionButton}
          >
            <AppText style={styles.permissionButtonText} variant="label">
              {permission.canAskAgain ? "İzin ver" : "Ayarları Aç"}
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  const resultPresentation =
    outcome?.kind === "result"
      ? resolveCheckinResultPresentation(outcome.value)
      : null;
  const resultInitials =
    outcome?.kind === "result"
      ? outcome.value.attendeeName.slice(0, 2).toUpperCase()
      : "";

  return (
    <View style={styles.container}>
      {isAppActive && !outcome ? (
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          facing="back"
          onBarcodeScanned={isSubmitting ? undefined : handleBarcodeScanned}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {!outcome ? (
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerFrame} />
          <AppText style={styles.scanInstruction} variant="body">
            Katılımcının giriş QR kodunu çerçeveye getir
          </AppText>
          {isSubmitting ? (
            <View style={styles.loadingPill}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <AppText style={styles.loadingText} variant="label">
                Kontrol ediliyor...
              </AppText>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <View
            style={[
              styles.resultCard,
              outcome.kind === "error"
                ? styles.errorCard
                : resultPresentation?.tone === "duplicate"
                  ? styles.duplicateCard
                  : styles.successCard,
            ]}
          >
            {outcome.kind === "result" ? (
              <>
                <Avatar
                  initials={resultInitials}
                  size={72}
                  uri={outcome.value.avatarUrl ?? undefined}
                />
                <Ionicons
                  color={
                    resultPresentation?.tone === "duplicate" ? "#A16207" : "#15803D"
                  }
                  name={
                    resultPresentation?.tone === "duplicate"
                      ? "alert-circle"
                      : "checkmark-circle"
                  }
                  size={40}
                />
                <AppText style={styles.resultTitle} variant="sectionTitle">
                  {resultPresentation?.title}
                </AppText>
                <AppText style={styles.resultTime} variant="body">
                  {formatEventTimeLabel(outcome.value.checkedInAt, timezone)}
                </AppText>
              </>
            ) : (
              <>
                <Ionicons color="#B91C1C" name="close-circle" size={52} />
                <AppText style={styles.resultTitle} variant="sectionTitle">
                  Giriş yapılamadı
                </AppText>
                <AppText style={styles.resultError} variant="body">
                  {outcome.message}
                </AppText>
              </>
            )}

            <Pressable onPress={scanNext} style={styles.nextButton}>
              <AppText style={styles.nextButtonText} variant="label">
                Sonrakini tara
              </AppText>
            </Pressable>
          </View>
        </View>
      )}

      {renderHeader()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#000000",
    flex: 1,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    left: 0,
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 3,
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
  headerTitle: {
    color: "#FFFFFF",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.75)",
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.34)",
    justifyContent: "center",
  },
  scannerFrame: {
    borderColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 3,
    height: 250,
    width: 250,
  },
  scanInstruction: {
    color: "#FFFFFF",
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    textAlign: "center",
  },
  loadingPill: {
    alignItems: "center",
    backgroundColor: "rgba(17,24,39,0.84)",
    borderRadius: 999,
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  loadingText: {
    color: "#FFFFFF",
  },
  permissionState: {
    alignItems: "center",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
  },
  permissionTitle: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  permissionText: {
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  permissionButtonText: {
    color: "#FFFFFF",
  },
  resultContainer: {
    alignItems: "center",
    backgroundColor: "#111827",
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.lg,
    width: "100%",
  },
  resultCard: {
    alignItems: "center",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
    width: "100%",
  },
  successCard: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  duplicateCard: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
  },
  errorCard: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
  resultTitle: {
    textAlign: "center",
  },
  resultTime: {
    color: theme.colors.textSecondary,
  },
  resultError: {
    color: "#B91C1C",
    textAlign: "center",
  },
  nextButton: {
    backgroundColor: "#111827",
    borderRadius: theme.radius.md,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  nextButtonText: {
    color: "#FFFFFF",
  },
});
