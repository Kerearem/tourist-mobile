import React, { useEffect, useMemo, useState } from "react";
import { FlatList } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { Screen } from "../../../components/ui/Screen";
import { EventsRoutes } from "../../../constants/routes";
import { useAuth } from "../../../hooks/useAuth";
import type { EventsStackParamList } from "../../../navigation/types";
import { EventCard } from "../components/EventCard";
import { getEvents } from "../services/events.service";
import type { EventItem } from "../types";

type Props = NativeStackScreenProps<EventsStackParamList, "EventsListScreen">;

export function EventsListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scopedEvents = useMemo(() => {
    if (!user) {
      return [];
    }
    return events.map((event) => ({
      ...event,
      isUserAttending: Boolean(event.isUserAttending),
    }));
  }, [events, user]);

  const loadEvents = async (mode: "initial" | "refresh") => {
    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const result = await getEvents();
      setEvents(result);
      setError(null);
    } catch {
      setEvents([]);
      setError("Failed to load events.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadEvents("initial");
  }, []);

  if (isLoading) {
    return (
      <Screen>
        <Loader label="Loading events..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState title="Could not load events" subtitle={error} />
      </Screen>
    );
  }

  return (
    <Screen>
      {scopedEvents.length === 0 ? (
        <EmptyState title="No events available" subtitle="Check again later for community events." />
      ) : (
        <FlatList
          data={scopedEvents}
          keyExtractor={(item) => item.id}
          onRefresh={() => void loadEvents("refresh")}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => navigation.navigate(EventsRoutes.EventDetailScreen, { eventId: item.id })}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}
