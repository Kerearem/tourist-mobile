import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import { getMyAttendedEvents, getUserAttendedEvents } from "../../events/services/organizer.service";
import type { EventItem } from "../../events/types";
import { formatProfileLocation } from "../../../utils/formatProfileLocation";

const formatEventDateParts = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { month: "---", day: "--" };
  }
  return {
    month: date.toLocaleString("tr-TR", { month: "short" }).replace(".", "").toUpperCase(),
    day: String(date.getDate()),
  };
};

const eventLocationLabel = (event: EventItem) => {
  const formatted = formatProfileLocation(event.city, event.countryCode);
  if (event.venueName?.trim()) {
    return `${event.venueName}, ${formatted ?? event.city}`;
  }
  return formatted ?? event.city;
};

type ProfileMemberEventsTabProps = {
  userId: string;
  isOwnProfile?: boolean;
  refreshToken?: number;
  onEventPress?: (eventId: string) => void;
};

export function ProfileMemberEventsTab({
  userId,
  isOwnProfile = false,
  refreshToken,
  onEventPress,
}: ProfileMemberEventsTabProps) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = isOwnProfile ? await getMyAttendedEvents() : await getUserAttendedEvents(userId);
      setEvents(items);
    } catch (err) {
      setEvents([]);
      setError(err instanceof Error ? err.message : "Etkinlikler yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, [isOwnProfile, userId]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents]),
  );

  React.useEffect(() => {
    if (refreshToken === undefined) {
      return;
    }
    void loadEvents();
  }, [loadEvents, refreshToken]);

  if (isLoading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateWrap}>
        <AppText style={styles.errorText} variant="bodyMuted">
          {error}
        </AppText>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.stateWrap}>
        <AppText variant="bodyMuted">Henüz katıldığı etkinlik yok.</AppText>
      </View>
    );
  }

  return (
    <View style={styles.eventsList}>
      {events.map((event) => {
        const { month, day } = formatEventDateParts(event.startsAt);
        return (
          <Pressable
            key={event.id}
            onPress={() => onEventPress?.(event.id)}
            style={styles.eventCard}
          >
            <View style={styles.dateBox}>
              <AppText style={styles.dateMonth} variant="caption">
                {month}
              </AppText>
              <AppText style={styles.dateDay} variant="sectionTitle">
                {day}
              </AppText>
            </View>
            <View style={styles.eventText}>
              <AppText numberOfLines={1} style={styles.eventTitle} variant="label">
                {event.title}
              </AppText>
              <AppText numberOfLines={1} variant="bodyMuted">
                {eventLocationLabel(event)}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stateWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
    padding: theme.spacing.lg,
  },
  errorText: {
    textAlign: "center",
  },
  eventsList: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  eventCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    minHeight: 92,
    padding: theme.spacing.md,
  },
  dateBox: {
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: theme.radius.md,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  dateMonth: {
    color: "#5B3CF6",
    fontWeight: "800",
  },
  dateDay: {
    color: "#5B3CF6",
  },
  eventText: {
    flex: 1,
  },
  eventTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
  },
});
