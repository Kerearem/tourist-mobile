import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { Screen } from "../../../components/ui/Screen";
import { useAuth } from "../../../hooks/useAuth";
import type { EventsStackParamList } from "../../../navigation/types";
import { EventMetaRow } from "../components/EventMetaRow";
import { getEventById, toggleEventAttendance } from "../services/events.service";
import type { EventItem } from "../types";

type Props = NativeStackScreenProps<EventsStackParamList, "EventDetailScreen">;

export function EventDetailScreen({ route }: Props) {
  const { user } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = async () => {
    setIsLoading(true);
    try {
      const result = await getEventById(route.params.eventId);
      if (!result) {
        setEvent(null);
      } else {
        setEvent({
          ...result,
          isUserAttending: user ? result.isUserAttending : false,
        });
      }
      setError(null);
    } catch {
      setEvent(null);
      setError("Failed to load event.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadEvent();
  }, [route.params.eventId, user?.id]);

  const onToggleAttend = async () => {
    if (!user?.id || !event) {
      return;
    }
    setIsUpdating(true);
    const updated = await toggleEventAttendance({
      eventId: event.id,
      userId: user.id,
    });
    setIsUpdating(false);
    if (updated) {
      setEvent(updated);
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <Loader label="Loading event..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState title="Could not load event" subtitle={error} />
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen>
        <EmptyState title="Event not found" subtitle="This event may have been removed." />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.container}>
        <AppText style={styles.title}>{event.title}</AppText>
        <AppText muted style={styles.subtitle}>
          Hosted by {event.host.displayName}
        </AppText>
        <AppText style={styles.description}>{event.description}</AppText>

        <EventMetaRow label="Type" value={event.type} />
        <EventMetaRow label="Visibility" value={event.visibility} />
        <EventMetaRow label="Location" value={`${event.city}, ${event.countryCode}`} />
        <EventMetaRow label="Starts" value={new Date(event.startsAt).toLocaleString()} />
        <EventMetaRow label="Attendees" value={`${event.attendeeCount}`} />
        {event.venueName ? <EventMetaRow label="Venue" value={event.venueName} /> : null}

        <AppButton
          label={isUpdating ? "Updating..." : event.isUserAttending ? "Leave Event" : "Attend Event"}
          onPress={() => void onToggleAttend()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 12,
  },
  subtitle: {
    marginBottom: 6,
  },
  description: {
    lineHeight: 22,
    marginBottom: 8,
  },
});
