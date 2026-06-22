import React, { useEffect, useState } from "react";
import { ImageBackground, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { EventsStackParamList } from "../../../navigation/types";
import { EventMetaRow } from "../components/EventMetaRow";
import { getEventById, toggleEventAttendance } from "../services/events.service";
import type { EventAttendanceStatus, EventItem } from "../types";

type Props = NativeStackScreenProps<EventsStackParamList, "EventDetailScreen">;

const toAttendanceUiState = (status?: EventAttendanceStatus): AttendanceUiState => {
  if (status === "approved") return "approved";
  if (status === "pending") return "pending";
  return "idle";
};

type AttendanceUiState = "idle" | "pending" | "approved";

const formatDateTime = (startsAt: string, endsAt?: string) => {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) {
    return "Date pending";
  }

  const startLabel = start.toLocaleString([], {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!endsAt) {
    return startLabel;
  }

  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) {
    return startLabel;
  }

  const endLabel = end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${startLabel} - ${endLabel}`;
};

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

const formatDateBadge = (startsAt: string) => {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    return { day: "--", weekday: "DAY" };
  }
  return {
    day: date.toLocaleDateString([], { day: "2-digit" }),
    weekday: date.toLocaleDateString([], { weekday: "short" }).toUpperCase(),
  };
};

export function EventDetailScreen({ route }: Props) {
  const { user } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [attendanceState, setAttendanceState] = useState<AttendanceUiState>("idle");
  const [isTogglingAttendance, setIsTogglingAttendance] = useState(false);
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

  const onToggleAttend = async () => {
    if (!event || !user || isTogglingAttendance) {
      return;
    }

    setIsTogglingAttendance(true);
    try {
      const updated = await toggleEventAttendance({ eventId: event.id, userId: user.id });
      if (!updated) {
        setError("Could not update attendance.");
        return;
      }

      setEvent(updated);
      setAttendanceState(toAttendanceUiState(updated.attendanceStatus));
      setError(null);
    } catch {
      setError("Could not update attendance.");
    } finally {
      setIsTogglingAttendance(false);
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
  const dateTimeLabel = formatDateTime(event.startsAt, event.endsAt);
  const dateBadge = formatDateBadge(event.startsAt);
  const locationLabel = event.venueName
    ? `${event.venueName} - ${event.city}, ${event.countryCode}`
    : `${event.city}, ${event.countryCode}`;
  const attendanceLabel =
    attendanceState === "approved" ? "Ayrıl" : attendanceState === "pending" ? "İptal Et" : "Başvur";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Card style={styles.heroCard}>
          <ImageBackground imageStyle={styles.heroImage} source={{ uri: getCoverUri(event) }} style={styles.heroCover}>
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
            <View style={styles.badgeRow}>
              <Badge label={event.type} />
              <Badge label={event.visibility} />
              {attendanceState === "approved" ? <Badge label="Approved" /> : attendanceState === "pending" ? <Badge label="Pending" /> : null}
            </View>
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

        <Pressable
          disabled={isTogglingAttendance || !user}
          onPress={() => void onToggleAttend()}
          style={[
            styles.attendButton,
            attendanceState === "pending" && styles.pendingButton,
            attendanceState === "approved" && styles.approvedButton,
            isTogglingAttendance && styles.disabledButton,
          ]}
        >
          <AppText style={styles.attendButtonLabel} variant="label">
            {isTogglingAttendance ? "Updating..." : attendanceLabel}
          </AppText>
        </Pressable>
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
    height: 220,
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
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  title: {
    marginTop: theme.spacing.xs,
  },
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
  attendButton: {
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: theme.radius.md,
    justifyContent: "center",
    minHeight: 48,
  },
  pendingButton: {
    backgroundColor: "#DC2626",
  },
  approvedButton: {
    backgroundColor: "#2563EB",
  },
  disabledButton: {
    opacity: 0.6,
  },
  attendButtonLabel: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});
