import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation, type NavigationProp } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { Badge } from "../../../components/ui/Badge";
import { ProfileRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { eventStatusLabel } from "../../events/utils/eventStatusLabel";
import { getMyOrganizerEvents, getOrganizerPublicEvents } from "../../events/services/organizer.service";
import type { EventItem } from "../../events/types";
import type { ProfileStackParamList } from "../../../navigation/types";
import { splitOrganizerProfileEvents } from "../utils/organizerProfileEvents";

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
  if (event.venueName?.trim()) {
    return `${event.venueName}, ${event.city}`;
  }
  return `${event.city}, ${event.countryCode}`;
};

type EventCardProps = {
  event: EventItem;
  onPress: () => void;
};

function OrganizerProfileEventCard({ event, onPress }: EventCardProps) {
  const { month, day } = formatEventDateParts(event.startsAt);

  return (
    <Pressable onPress={onPress} style={styles.eventCard}>
      <View style={styles.dateBox}>
        <AppText style={styles.dateMonth} variant="caption">
          {month}
        </AppText>
        <AppText style={styles.dateDay} variant="sectionTitle">
          {day}
        </AppText>
      </View>
      <View style={styles.eventText}>
        <AppText numberOfLines={2} style={styles.eventTitle} variant="label">
          {event.title}
        </AppText>
        <AppText numberOfLines={1} variant="bodyMuted">
          {eventLocationLabel(event)}
        </AppText>
      </View>
      <Badge label={eventStatusLabel(event)} />
    </Pressable>
  );
}

type EventSectionProps = {
  title: string;
  events: EventItem[];
  onEventPress: (eventId: string) => void;
};

function EventSection({ title, events, onEventPress }: EventSectionProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <AppText style={styles.sectionTitle} variant="label">
        {title}
      </AppText>
      {events.map((event) => (
        <OrganizerProfileEventCard key={event.id} event={event} onPress={() => onEventPress(event.id)} />
      ))}
    </View>
  );
}

type ProfileOrganizerEventsTabProps = {
  organizerUserId: string;
  isOwnProfile?: boolean;
  onEventPress?: (eventId: string) => void;
};

export function ProfileOrganizerEventsTab({
  organizerUserId,
  isOwnProfile = true,
  onEventPress,
}: ProfileOrganizerEventsTabProps) {
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = isOwnProfile
        ? await getMyOrganizerEvents()
        : await getOrganizerPublicEvents(organizerUserId);
      setEvents(data);
      setError(null);
    } catch {
      setEvents([]);
      setError("Etkinlikler yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, [isOwnProfile, organizerUserId]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents]),
  );

  const { active, past } = splitOrganizerProfileEvents(events);

  const openEventDetail = (eventId: string) => {
    if (onEventPress) {
      onEventPress(eventId);
      return;
    }
    navigation.navigate(ProfileRoutes.EventDetailScreen, { eventId });
  };

  if (isLoading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <AppText variant="bodyMuted">Etkinlikler yükleniyor...</AppText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateWrap}>
        <Ionicons color={theme.colors.muted} name="alert-circle-outline" size={36} />
        <AppText style={styles.errorText} variant="bodyMuted">
          {error}
        </AppText>
        <Pressable onPress={() => void loadEvents()} style={styles.retryButton}>
          <AppText style={styles.retryText} variant="label">
            Tekrar dene
          </AppText>
        </Pressable>
      </View>
    );
  }

  if (active.length === 0 && past.length === 0) {
    return (
      <View style={styles.stateWrap}>
        <Ionicons color={theme.colors.muted} name="calendar-outline" size={40} />
        <AppText style={styles.emptyTitle} variant="label">
          {isOwnProfile ? "Henüz yayınlanmış etkinlik yok" : "Henüz public etkinlik yok"}
        </AppText>
        <AppText style={styles.emptySubtitle} variant="bodyMuted">
          {isOwnProfile
            ? "Onaylanan etkinliklerin burada görünecek."
            : "Onaylanmış etkinlikler burada listelenir."}
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      <EventSection events={active} onEventPress={openEventDetail} title="Aktif Etkinlikler" />
      <EventSection events={past} onEventPress={openEventDetail} title="Geçmiş Etkinlikler" />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.xl,
    padding: theme.spacing.lg,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
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
    gap: theme.spacing.xs,
  },
  eventTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
  },
  stateWrap: {
    alignItems: "center",
    gap: theme.spacing.sm,
    justifyContent: "center",
    minHeight: 220,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  errorText: {
    textAlign: "center",
  },
  retryButton: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  retryText: {
    color: theme.colors.primary,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
  },
});
