import React, { useCallback, useEffect, useState } from "react";
import { ImageBackground, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation, type NavigationProp } from "@react-navigation/native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { MessagesRoutes, TabRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { MEDIA_CONTENT_CONTRACTS, getDisplayResizeMode } from "../../../services/media/mediaContentContracts";
import { useAuth } from "../../../hooks/useAuth";
import type { EventsStackParamList, MainTabParamList } from "../../../navigation/types";
import { EventMetaRow } from "../components/EventMetaRow";
import { EventDetailOfferings } from "../components/EventDetailOfferings";
import { EVENT_FILTER_APPLY_RED } from "../constants/eventFilterTheme";
import { HELP_FILTER_APPLY_GREEN } from "../../help/constants/helpCategories";
import { createEventGroup, getEventGroup, type EventGroupInfo } from "../services/eventGroup.service";
import { getEventById, toggleEventAttendance } from "../services/events.service";
import type { EventAttendanceStatus, EventItem } from "../types";
import { formatEventJoinCtaLabel, canAttemptEventJoin, resolveEventTokenPrice, resolveEventTicketAvailable } from "../utils/eventTicketPricing";
import { resolveEventAttendanceError } from "../utils/resolveEventAttendanceError";
import { formatEventDateBadge, formatEventDateTimeRange } from "../utils/eventTimezone";

type Props = NativeStackScreenProps<EventsStackParamList, "EventDetailScreen">;

const toAttendanceUiState = (status?: EventAttendanceStatus): AttendanceUiState => {
  if (status === "approved") return "approved";
  if (status === "pending") return "pending";
  return "idle";
};

type AttendanceUiState = "idle" | "pending" | "approved";

const getCoverUri = (event: EventItem) => {
  if (event.coverImageUrl) {
    return event.coverImageUrl;
  }
  if (event.type === "social") {
    return "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1400&q=80";
  }
  if (event.type === "outdoor") {
    return "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=80";
  }
  return "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80";
};

export function EventDetailScreen({ route }: Props) {
  const { user } = useAuth();
  const tabNavigation = useNavigation<NavigationProp<MainTabParamList>>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [groupInfo, setGroupInfo] = useState<EventGroupInfo | null>(null);
  const [isGroupSubmitting, setIsGroupSubmitting] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceState, setAttendanceState] = useState<AttendanceUiState>("idle");
  const [isTogglingAttendance, setIsTogglingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = async () => {
    setIsLoading(true);
    try {
      const result = await getEventById(route.params.eventId);
      if (!result) {
        setEvent(null);
        setAttendanceState("idle");
      } else {
        setEvent({
          ...result,
          isUserAttending: user ? result.isUserAttending : false,
        });
        setAttendanceState(user ? toAttendanceUiState(result.attendanceStatus) : "idle");
      }
      setError(null);
    } catch {
      setEvent(null);
      setAttendanceState("idle");
      setError("Failed to load event.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEvent();
  }, [route.params.eventId, user?.id]);

  const loadGroupInfo = useCallback(async (eventId: string) => {
    try {
      const group = await getEventGroup(eventId);
      setGroupInfo(group);
      setGroupError(null);
      return group;
    } catch {
      setGroupInfo(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!event) {
      setGroupInfo(null);
      return;
    }

    void loadGroupInfo(event.id);
  }, [event?.id, loadGroupInfo]);

  const onToggleAttend = async () => {
    if (!event || !user || isTogglingAttendance) {
      return;
    }

    setIsTogglingAttendance(true);
    setAttendanceError(null);
    try {
      const updated = await toggleEventAttendance({ eventId: event.id, userId: user.id });
      if (!updated) {
        setError("Could not update attendance.");
        return;
      }

      setEvent(updated);
      setAttendanceState(toAttendanceUiState(updated.attendanceStatus));
      setAttendanceError(null);
      if (updated.attendanceStatus === "approved") {
        await loadGroupInfo(updated.id);
      } else if (updated.attendanceStatus === "none") {
        setGroupInfo(null);
      }
    } catch (toggleError) {
      setAttendanceError(resolveEventAttendanceError(toggleError));
    } finally {
      setIsTogglingAttendance(false);
    }
  };

  const openGroupScreen = (eventId: string, conversationId?: string) => {
    tabNavigation.navigate(TabRoutes.MessagesTab, {
      screen: MessagesRoutes.GroupDetailScreen,
      params: { eventId, conversationId },
    });
  };

  const onGroupAction = async () => {
    if (!event || isGroupSubmitting) {
      return;
    }

    if (groupInfo) {
      openGroupScreen(event.id, groupInfo.conversationId);
      return;
    }

    setIsGroupSubmitting(true);
    setGroupError(null);
    try {
      const created = await createEventGroup(event.id);
      setGroupInfo(created);
      openGroupScreen(event.id, created.conversationId);
    } catch {
      const existing = await loadGroupInfo(event.id);
      if (existing) {
        openGroupScreen(event.id, existing.conversationId);
        return;
      }
      setGroupError("Grup oluşturulamadı.");
    } finally {
      setIsGroupSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Card style={styles.stateCard}>
          <Loader label="Loading event..." />
        </Card>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Card style={styles.stateCard}>
          <ErrorState onRetry={() => void loadEvent()} title="Could not load event" subtitle={error} />
        </Card>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Card style={styles.stateCard}>
          <EmptyState title="Event not found" subtitle="This event may have been removed." />
        </Card>
      </SafeAreaView>
    );
  }

  const hostInitials = event.host.displayName.slice(0, 2).toUpperCase();
  const dateTimeLabel = formatEventDateTimeRange(event.startsAt, event.endsAt, event.timezone);
  const dateBadge = formatEventDateBadge(event.startsAt, event.timezone);
  const locationLabel = event.venueName
    ? `${event.venueName} - ${event.city}, ${event.countryCode}`
    : `${event.city}, ${event.countryCode}`;
  const tokenPrice = resolveEventTokenPrice(event);
  const ticketAvailable = resolveEventTicketAvailable(event);
  const canAttemptJoin = canAttemptEventJoin(event, attendanceState);
  const attendanceLabel = formatEventJoinCtaLabel(tokenPrice, attendanceState);
  const isHost = Boolean(user && event.host.id === user.id);
  const isApproved = event.metadata?.status === "APPROVED";
  const canJoin = event.canJoin !== false;
  const joinBlockReason = event.joinBlockReason ?? "Bu etkinliğe tekrar katılamazsın";
  const isJoinBlocked =
    isTogglingAttendance || !user || (!canJoin && attendanceState === "idle") || !canAttemptJoin;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Card style={styles.heroCard}>
          <ImageBackground
            imageStyle={styles.heroImage}
            resizeMode={getDisplayResizeMode("eventCover")}
            source={{ uri: getCoverUri(event) }}
            style={styles.heroCover}
          >
            <View style={styles.dateBadge}>
              <AppText style={styles.dateWeekday} variant="caption">
                {dateBadge.weekday}
              </AppText>
              <AppText style={styles.dateDay} variant="sectionTitle">
                {dateBadge.day}
              </AppText>
            </View>
            <View style={styles.locationPill}>
              <AppText style={styles.locationPillText} variant="caption">
                {event.city}, {event.countryCode}
              </AppText>
            </View>
          </ImageBackground>
          <View style={styles.heroContent}>
            <AppText style={styles.title} variant="title">
              {event.title}
            </AppText>
            <AppText variant="bodyMuted">{dateTimeLabel}</AppText>
            <AppText variant="bodyMuted">{locationLabel}</AppText>
          </View>
        </Card>

        <Card>
          <AppText style={styles.sectionTitle} variant="sectionTitle">
            Organizer
          </AppText>
          <View style={styles.hostRow}>
            <Avatar initials={hostInitials} size="md" uri={event.host.avatarUrl} />
            <View style={styles.hostText}>
              <AppText variant="label">{event.host.displayName}</AppText>
              <AppText variant="caption">Community host</AppText>
            </View>
          </View>
        </Card>

        <Card>
          <AppText style={styles.sectionTitle} variant="sectionTitle">
            Event details
          </AppText>
          <EventMetaRow label="When" value={dateTimeLabel} />
          <EventMetaRow label="Location" value={locationLabel} />
          <EventMetaRow label="Attendees" value={`${event.attendeeCount}`} />
          {event.capacity ? <EventMetaRow label="Capacity" value={`${event.capacity}`} /> : null}
        </Card>

        <Card>
          <AppText style={styles.sectionTitle} variant="sectionTitle">
            About this event
          </AppText>
          <AppText style={styles.description} variant="body">
            {event.description}
          </AppText>
        </Card>

        <Card>
          <AppText style={styles.sectionTitle} variant="sectionTitle">
            Bu etkinlik size neler sunuyor?
          </AppText>
          <EventDetailOfferings event={event} />
        </Card>

        {isHost && isApproved ? (
          <Pressable
            disabled={isGroupSubmitting}
            onPress={() => void onGroupAction()}
            style={[styles.groupButton, isGroupSubmitting && styles.disabledButton]}
          >
            <AppText style={styles.groupButtonLabel} variant="label">
              {isGroupSubmitting ? "Hazırlanıyor..." : groupInfo ? "Gruba Git" : "Grup Oluştur"}
            </AppText>
          </Pressable>
        ) : null}

        {!isHost && attendanceState === "approved" && groupInfo?.isMember ? (
          <Pressable
            onPress={() => openGroupScreen(event.id, groupInfo.conversationId)}
            style={styles.groupButton}
          >
            <AppText style={styles.groupButtonLabel} variant="label">
              Gruba Git
            </AppText>
          </Pressable>
        ) : null}

        {groupError ? (
          <AppText style={styles.groupError} variant="caption">
            {groupError}
          </AppText>
        ) : null}

        {!isHost ? (
          <>
            {!canJoin && attendanceState === "idle" ? (
              <AppText style={styles.joinBlockText} variant="caption">
                {joinBlockReason}
              </AppText>
            ) : null}
            {!ticketAvailable && attendanceState === "idle" ? (
              <AppText style={styles.joinBlockText} variant="caption">
                Bilet fiyatı güncelleniyor. Lütfen daha sonra tekrar dene.
              </AppText>
            ) : null}
            {attendanceError ? (
              <AppText style={styles.joinBlockText} variant="caption">
                {attendanceError}
              </AppText>
            ) : null}
            <Pressable
              disabled={isJoinBlocked}
              onPress={() => void onToggleAttend()}
              style={[
                styles.attendButton,
                attendanceState === "pending" && styles.pendingButton,
                attendanceState === "approved" && styles.approvedButton,
                isJoinBlocked && styles.disabledButton,
              ]}
            >
              <AppText style={styles.attendButtonLabel} variant="label">
                {isTogglingAttendance ? "Güncelleniyor..." : attendanceLabel}
              </AppText>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  container: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.md,
  },
  stateCard: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    flex: 1,
    justifyContent: "center",
  },
  heroCard: {
    overflow: "hidden",
    padding: 0,
  },
  heroCover: {
    aspectRatio:
      MEDIA_CONTENT_CONTRACTS.eventCover.aspectWidth / MEDIA_CONTENT_CONTRACTS.eventCover.aspectHeight,
    justifyContent: "space-between",
    padding: theme.spacing.md,
  },
  heroImage: {
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
  },
  heroContent: {
    gap: theme.spacing.xs,
    padding: theme.spacing.lg,
  },
  title: {},
  dateBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    minWidth: 56,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  dateWeekday: {
    color: "#EF4444",
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  dateDay: {
    color: theme.colors.textPrimary,
    lineHeight: 24,
  },
  locationPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(17, 24, 39, 0.72)",
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  locationPillText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
  },
  hostRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  hostText: {
    gap: 2,
  },
  description: {
    color: theme.colors.textPrimary,
  },
  joinBlockText: {
    color: theme.colors.danger,
    marginBottom: theme.spacing.xs,
    textAlign: "center",
  },
  attendButton: {
    alignItems: "center",
    backgroundColor: HELP_FILTER_APPLY_GREEN,
    borderRadius: theme.radius.md,
    justifyContent: "center",
    minHeight: 48,
  },
  pendingButton: {
    backgroundColor: EVENT_FILTER_APPLY_RED,
  },
  approvedButton: {
    backgroundColor: EVENT_FILTER_APPLY_RED,
  },
  disabledButton: {
    opacity: 0.6,
  },
  attendButtonLabel: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  groupButton: {
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    borderRadius: theme.radius.md,
    justifyContent: "center",
    minHeight: 48,
  },
  groupButtonLabel: {
    color: "#1D4ED8",
    fontSize: 16,
    fontWeight: "700",
  },
  groupError: {
    color: theme.colors.danger,
    textAlign: "center",
  },
});
