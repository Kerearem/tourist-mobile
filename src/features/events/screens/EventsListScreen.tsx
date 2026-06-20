import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { Screen } from "../../../components/ui/Screen";
import { EventsRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { EventsStackParamList } from "../../../navigation/types";
import { EventCategoryTabs } from "../components/EventCategoryTabs";
import { EventCard } from "../components/EventCard";
import { EventsFilterSheet } from "../components/EventsFilterSheet";
import { EventTopSearch } from "../components/EventTopSearch";
import { getEvents, toggleEventAttendance } from "../services/events.service";
import type { EventItem } from "../types";
import { DEFAULT_EVENTS_FILTERS, type EventsFilterState } from "../types/filters";

type Props = NativeStackScreenProps<EventsStackParamList, "EventsListScreen">;

const demoEvents: EventItem[] = [
  {
    id: "event_demo_social",
    title: "International Food Festival",
    description: "Meet nearby expats and discover social opportunities around your city.",
    host: { id: "host_berlin_expats", displayName: "Berlin Expats" },
    type: "social",
    visibility: "city",
    city: "Berlin",
    countryCode: "DE",
    startsAt: "2026-05-24T12:00:00.000Z",
    attendeeCount: 127,
    isUserAttending: false,
  },
  {
    id: "event_demo_networking",
    title: "Startup Networking Night",
    description: "An evening to meet founders, engineers and creatives in your community.",
    host: { id: "host_tourist_team", displayName: "Tourist Community" },
    type: "community",
    visibility: "city",
    city: "Berlin",
    countryCode: "DE",
    startsAt: "2026-05-29T17:30:00.000Z",
    attendeeCount: 86,
    isUserAttending: true,
  },
];

export function EventsListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [activeChip, setActiveChip] = useState("All");
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<EventsFilterState>(DEFAULT_EVENTS_FILTERS);

  const scopedEvents = useMemo(() => {
    if (!user) {
      return [];
    }
    return events.map((event) => ({
      ...event,
      isUserAttending: Boolean(event.isUserAttending),
    }));
  }, [events, user]);

  const eventsForUi = useMemo(() => {
    if (scopedEvents.length > 0) {
      return scopedEvents;
    }
    if (error) {
      return demoEvents;
    }
    return scopedEvents;
  }, [error, scopedEvents]);

  const loadEvents = async (mode: "initial" | "refresh") => {
    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const result = await getEvents({
        scope: filters.community === "my_community" ? "community" : "global",
        ...(activeChip !== "All" ? { type: activeChip.toLowerCase() as EventItem["type"] } : {}),
      });
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
  }, [filters.community, activeChip]);

  const onToggleJoin = async (event: EventItem) => {
    if (!user || togglingEventId) {
      return;
    }

    setTogglingEventId(event.id);
    try {
      const updated = await toggleEventAttendance({ eventId: event.id, userId: user.id });
      if (!updated) {
        return;
      }

      setEvents((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
    } catch {
      setError("Could not update attendance.");
    } finally {
      setTogglingEventId(null);
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <Loader label="Loading events..." />
        </Card>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <ErrorState onRetry={() => void loadEvents("initial")} title="Could not load events" subtitle={error} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.topSearchWrap}>
          <EventTopSearch
            locationLabel={`${user?.publicProfile.currentCity || "Anywhere"} · This week`}
            onChangeText={setSearchText}
            value={searchText}
          />
          <Pressable onPress={() => setIsFilterOpen(true)} style={styles.filterTapTarget}>
            <Ionicons color={theme.colors.textPrimary} name="options-outline" size={20} />
          </Pressable>
        </View>
        <EventCategoryTabs activeTab={activeChip} onChange={setActiveChip} />

        {eventsForUi.length === 0 ? (
          <Card style={styles.stateCard}>
            <EmptyState
              actionLabel="Refresh"
              description="Check again later for community events."
              onActionPress={() => void loadEvents("initial")}
              title="No events available"
            />
          </Card>
        ) : (
          <FlatList
            data={eventsForUi}
            keyExtractor={(item) => item.id}
            onRefresh={() => void loadEvents("refresh")}
            refreshing={refreshing}
            renderItem={({ item }) => (
              <EventCard
                event={item}
                isJoined={Boolean(item.isUserAttending)}
                onToggleJoin={() => void onToggleJoin(item)}
                onPress={() => navigation.navigate(EventsRoutes.EventDetailScreen, { eventId: item.id })}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      <EventsFilterSheet
        filters={filters}
        onApply={() => setIsFilterOpen(false)}
        onChange={setFilters}
        onClearAll={() => setFilters(DEFAULT_EVENTS_FILTERS)}
        onClose={() => setIsFilterOpen(false)}
        visible={isFilterOpen}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    flex: 1,
    gap: theme.spacing.md,
  },
  topSearchWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  filterTapTarget: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8ECF1",
    borderRadius: 32,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  stateCard: {
    flex: 1,
    justifyContent: "center",
  },
  listContent: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
});
