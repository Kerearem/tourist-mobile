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
import { EventCard } from "../components/EventCard";
import { EventsFilterSheet } from "../components/EventsFilterSheet";
import { EventsTabSegmentControl } from "../components/EventsTabSegmentControl";
import { EventTopSearch } from "../components/EventTopSearch";
import { PersonalEventsList } from "../components/PersonalEventsList";
import { getEvents, toggleEventAttendance } from "../services/events.service";
import type { EventItem } from "../types";
import {
  DEFAULT_EVENTS_FILTERS,
  buildEventsListQuery,
  type EventsFilterState,
} from "../types/filters";
import {
  normalizeEventsTabSection,
  resolveEventsTabSegments,
  type EventsTabSection,
} from "../utils/eventsTabUx";
import { canUseAlcoholAndSmokingFilters } from "../utils/viewerAge";

type Props = NativeStackScreenProps<EventsStackParamList, "EventsListScreen">;

export function EventsListScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const userContext = useMemo(
    () => ({
      organizerStatus: user?.organizerStatus ?? null,
      accountType: user?.accountType ?? null,
    }),
    [user?.accountType, user?.organizerStatus],
  );
  const segments = useMemo(() => resolveEventsTabSegments(userContext), [userContext]);
  const [activeSection, setActiveSection] = useState<EventsTabSection>(() =>
    normalizeEventsTabSection(route.params?.section, userContext),
  );

  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<EventsFilterState>(DEFAULT_EVENTS_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<EventsFilterState>(DEFAULT_EVENTS_FILTERS);

  useEffect(() => {
    if (route.params?.section) {
      setActiveSection(normalizeEventsTabSection(route.params.section, userContext));
    }
  }, [route.params?.section, userContext]);

  useEffect(() => {
    if (!segments.some((segment) => segment.key === activeSection)) {
      setActiveSection("discover");
    }
  }, [activeSection, segments]);

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

  const showAlcoholAndSmokingFilters = useMemo(
    () => canUseAlcoholAndSmokingFilters(user?.privateProfile.birthDate),
    [user?.privateProfile.birthDate],
  );

  const listQuery = useMemo(
    () => buildEventsListQuery(appliedFilters, { search: debouncedSearch }),
    [appliedFilters, debouncedSearch],
  );

  const loadEvents = useCallback(
    async (mode: "initial" | "refresh") => {
      if (activeSection !== "discover") {
        return;
      }

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
    [activeSection, listQuery],
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

  const renderDiscover = () => {
    if (isLoading) {
      return (
        <Card style={styles.stateCard}>
          <Loader label="Etkinlikler yükleniyor..." />
        </Card>
      );
    }

    if (error) {
      return (
        <Card style={styles.stateCard}>
          <ErrorState onRetry={() => void loadEvents("initial")} subtitle={error} title="Etkinlikler yüklenemedi" />
        </Card>
      );
    }

    if (scopedEvents.length === 0) {
      return (
        <Card style={styles.stateCard}>
          <EmptyState
            actionLabel="Yenile"
            description="Filtreleri değiştir veya daha sonra tekrar dene."
            onActionPress={() => void loadEvents("initial")}
            title="Etkinlik bulunamadı"
          />
        </Card>
      );
    }

    return (
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
    );
  };

  return (
    <Screen>
      <View style={styles.container}>
        <EventsTabSegmentControl
          activeSection={activeSection}
          onChange={setActiveSection}
          segments={segments}
        />

        {activeSection === "discover" ? (
          <>
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
            {renderDiscover()}
          </>
        ) : null}

        {activeSection === "attended" ? (
          <PersonalEventsList mode="attended" navigation={navigation} userContext={userContext} />
        ) : null}

        {activeSection === "created" ? (
          <PersonalEventsList mode="created" navigation={navigation} userContext={userContext} />
        ) : null}
      </View>

      <EventsFilterSheet
        filters={draftFilters}
        onApply={onApplyFilters}
        onChange={setDraftFilters}
        onClearAll={onClearFilters}
        onClose={() => setIsFilterOpen(false)}
        showAlcoholAndSmokingFilters={showAlcoholAndSmokingFilters}
        visible={isFilterOpen && activeSection === "discover"}
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
