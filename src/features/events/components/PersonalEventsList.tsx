import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect, useNavigation, type NavigationProp } from "@react-navigation/native";

import { AppText } from "../../../components/ui/AppText";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { MessagesRoutes, TabRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import type { MainTabParamList } from "../../../navigation/types";
import { isActiveOrganizerProfileEvent } from "../../profile/utils/organizerProfileEvents";
import { createEventGroup, getEventGroup } from "../services/eventGroup.service";
import { getMyAttendedEvents, getMyOrganizerEvents } from "../services/organizer.service";
import type { EventItem } from "../types";
import {
  attendedEventStatusLabel,
  navigateAttendedEventDetail,
  navigateCreatedEventTarget,
  organizerManagedEventStatusLabel,
  resolveAttendedEventsEmptyState,
  resolveCreatedEventsEmptyState,
  type EventsTabUserContext,
} from "../utils/eventsTabUx";
import { EventCard } from "./EventCard";

type PersonalEventsListProps = {
  mode: "attended" | "created";
  userContext: EventsTabUserContext;
  navigation: { navigate: (screen: string, params?: object) => void };
};

export function PersonalEventsList({ mode, userContext, navigation }: PersonalEventsListProps) {
  const tabNavigation = useNavigation<NavigationProp<MainTabParamList>>();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = mode === "attended" ? await getMyAttendedEvents() : await getMyOrganizerEvents();
      setEvents(data);
      setError(null);
    } catch {
      setEvents([]);
      setError("Etkinlikler yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, [loadEvents]),
  );

  const onGroupPress = async (event: EventItem) => {
    try {
      let group = await getEventGroup(event.id);
      if (!group) {
        group = await createEventGroup(event.id);
      }
      tabNavigation.navigate(TabRoutes.MessagesTab, {
        screen: MessagesRoutes.GroupDetailScreen,
        params: { eventId: event.id, conversationId: group.conversationId },
      });
    } catch {
      // Group may not exist yet for pending events; ignore silently.
    }
  };

  const onAttendedPress = (event: EventItem) => {
    navigateAttendedEventDetail(navigation, event);
  };

  const onCreatedPress = (event: EventItem) => {
    navigateCreatedEventTarget(navigation, event);
  };

  const emptyState =
    mode === "attended"
      ? resolveAttendedEventsEmptyState()
      : resolveCreatedEventsEmptyState(userContext);

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
        <ErrorState onRetry={() => void loadEvents()} subtitle={error} title="Etkinlikler yüklenemedi" />
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card style={styles.stateCard}>
        <EmptyState description={emptyState.description} title={emptyState.title} />
      </Card>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={events}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.itemWrap}>
          <View style={styles.statusRow}>
            <Badge
              label={
                mode === "attended"
                  ? attendedEventStatusLabel(item)
                  : organizerManagedEventStatusLabel(item)
              }
            />
            {mode === "created" && isActiveOrganizerProfileEvent(item) ? (
              <Pressable onPress={() => void onGroupPress(item)} style={styles.groupLink}>
                <AppText style={styles.groupLinkText} variant="caption">
                  Grup
                </AppText>
              </Pressable>
            ) : null}
          </View>
          <EventCard
            event={item}
            isJoined={mode === "attended" ? Boolean(item.isUserAttending) : false}
            onToggleJoin={() => undefined}
            onPress={() => {
              if (mode === "attended") {
                onAttendedPress(item);
                return;
              }
              onCreatedPress(item);
            }}
          />
          {mode === "attended" ? (
            <AppText style={styles.hint} variant="caption">
              Katılımcı görünümü
            </AppText>
          ) : (
            <AppText style={styles.hint} variant="caption">
              Organizatör görünümü
            </AppText>
          )}
        </View>
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  stateCard: {
    flex: 1,
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.sm,
  },
  itemWrap: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xs,
  },
  groupLink: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
  },
  groupLinkText: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  hint: {
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.xs,
  },
});
