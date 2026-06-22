import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  DEFAULT_EVENTS_FILTERS,
  buildEventsListQuery,
  type EventsFilterState,
} from "../types/filters";

type Props = NativeStackScreenProps<EventsStackParamList, "EventsListScreen">;

export function EventsListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeChip, setActiveChip] = useState("All");
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<EventsFilterState>(DEFAULT_EVENTS_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<EventsFilterState>(DEFAULT_EVENTS_FILTERS);

  const scopedEvents = useMemo(() => {
    if (!user) {
      return [];
    }
    return events.map((event) => ({
      ...event,
      isUserAttending: Boolean(event.isUserAttending),
    }));
  }, [events, user]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (isFilterOpen) {
      setDraftFilters(appliedFilters);
    }
  }, [appliedFilters, isFilterOpen]);

  const listQuery = useMemo(
    () => buildEventsListQuery(appliedFilters, { search: debouncedSearch, activeTab: activeChip }),
    [activeChip, appliedFilters, debouncedSearch],
  );

  const loadEvents = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "initial") {
        setIsLoading(true);
      } else {
        setRefreshing(true);
      }

      try {
        const result = await getEvents(listQuery);
        setEvents(result);
        setError(null);
      } catch {
        setEvents([]);
        setError("Etkinlikler yüklenemedi.");
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [listQuery],
  );

  useEffect(() => {
    void loadEvents("initial");
  }, [loadEvents]);

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
      setError("Katılım durumu güncellenemedi.");
    } finally {
      setTogglingEventId(null);
    }
  };

  const onApplyFilters = () => {
    setAppliedFilters(draftFilters);
    setIsFilterOpen(false);
  };

  const onClearFilters = () => {
    setDraftFilters(DEFAULT_EVENTS_FILTERS);
  };

  if (isLoading) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <Loader label="Etkinlikler yükleniyor..." />
        </Card>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <ErrorState onRetry={() => void loadEvents("initial")} subtitle={error} title="Etkinlikler yüklenemedi" />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.topSearchWrap}>
          <EventTopSearch
            locationLabel={`${user?.publicProfile.currentCity || "Her yer"} · Bu hafta`}
            onChangeText={setSearchText}
            value={searchText}
          />
          <Pressable onPress={() => setIsFilterOpen(true)} style={styles.filterTapTarget}>
            <Ionicons color={theme.colors.textPrimary} name="options-outline" size={20} />
          </Pressable>
        </View>
        <EventCategoryTabs activeTab={activeChip} onChange={setActiveChip} />

        {scopedEvents.length === 0 ? (
          <Card style={styles.stateCard}>
            <EmptyState
              actionLabel="Yenile"
              description="Filtreleri değiştir veya daha sonra tekrar dene."
              onActionPress={() => void loadEvents("initial")}
              title="Etkinlik bulunamadı"
            />
          </Card>
        ) : (
          <FlatList
            data={scopedEvents}
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
        filters={draftFilters}
        onApply={onApplyFilters}
        onChange={setDraftFilters}
        onClearAll={onClearFilters}
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
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },
});
