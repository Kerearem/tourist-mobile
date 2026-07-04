import React, { useCallback, useState } from "react";
import { FlatList, Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation, type NavigationProp } from "@react-navigation/native";

import { AppText } from "../../../components/ui/AppText";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { MessagesRoutes, ProfileRoutes, TabRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import type { EventsStackParamList, MainTabParamList, ProfileStackParamList } from "../../../navigation/types";
import { EventCard } from "../components/EventCard";
import { createEventGroup, getEventGroup } from "../services/eventGroup.service";
import { getMyAttendedEvents, getMyOrganizerEvents } from "../services/organizer.service";
import type { EventItem } from "../types";

type Props = NativeStackScreenProps<
  EventsStackParamList & ProfileStackParamList,
  "MyOrganizerEventsScreen"
>;

type TabKey = "created" | "attended";

import { eventStatusLabel } from "../utils/eventStatusLabel";
import { isActiveOrganizerProfileEvent } from "../../profile/utils/organizerProfileEvents";

const attendanceLabel = (event: EventItem) => {
  if (event.attendanceStatus === "approved") return "Katıldın";
  if (event.attendanceStatus === "pending") return "Onay Bekliyor";
  return "Katılım";
};

export function MyOrganizerEventsScreen({ navigation }: Props) {
  const tabNavigation = useNavigation<NavigationProp<MainTabParamList>>();
  const [activeTab, setActiveTab] = useState<TabKey>("created");
  const [createdEvents, setCreatedEvents] = useState<EventItem[]>([]);
  const [attendedEvents, setAttendedEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const [created, attended] = await Promise.all([getMyOrganizerEvents(), getMyAttendedEvents()]);
      setCreatedEvents(created);
      setAttendedEvents(attended);
      setError(null);
    } catch {
      setCreatedEvents([]);
      setAttendedEvents([]);
      setError("Etkinlikler yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadEvents();
    }, []),
  );

  const events = activeTab === "created" ? createdEvents : attendedEvents;

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
      // silent for now
    }
  };

  const renderEvent = (item: EventItem) => (
    <View style={styles.itemWrap}>
      <View style={styles.statusRow}>
        <Badge label={activeTab === "created" ? eventStatusLabel(item) : attendanceLabel(item)} />
        {activeTab === "created" && isActiveOrganizerProfileEvent(item) ? (
          <Pressable onPress={() => void onGroupPress(item)} style={styles.groupLink}>
            <AppText style={styles.groupLinkText} variant="caption">
              Grup
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <EventCard
        event={item}
        isJoined={Boolean(item.isUserAttending)}
        onToggleJoin={() => undefined}
        onPress={() => navigation.navigate(ProfileRoutes.EventDetailScreen, { eventId: item.id })}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pagePadding}>
        <ScreenBackHeader onBack={() => navigation.goBack()} title="Etkinliklerim" />

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setActiveTab("created")}
            style={[styles.tab, activeTab === "created" && styles.tabActive]}
          >
            <AppText style={activeTab === "created" ? styles.tabTextActive : styles.tabText} variant="label">
              Oluşturduklarım
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("attended")}
            style={[styles.tab, activeTab === "attended" && styles.tabActive]}
          >
            <AppText style={activeTab === "attended" ? styles.tabTextActive : styles.tabText} variant="label">
              Katıldıklarım
            </AppText>
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <Card style={styles.stateCard}>
          <Loader label="Etkinlikler yükleniyor..." />
        </Card>
      ) : error ? (
        <Card style={styles.stateCard}>
          <ErrorState onRetry={() => void loadEvents()} subtitle={error} title="Etkinlikler yüklenemedi" />
        </Card>
      ) : events.length === 0 ? (
        <Card style={styles.stateCard}>
          <EmptyState
            description={
              activeTab === "created"
                ? "Henüz bir etkinlik oluşturmadın."
                : "Henüz bir etkinliğe katılmadın."
            }
            title={activeTab === "created" ? "Etkinlik yok" : "Katıldığın etkinlik yok"}
          />
        </Card>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderEvent(item)}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  pagePadding: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  tabs: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  tab: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    flex: 1,
    paddingVertical: theme.spacing.sm,
  },
  tabActive: {
    backgroundColor: "#111827",
  },
  tabText: {
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  tabTextActive: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  stateCard: {
    flex: 1,
    justifyContent: "center",
    marginHorizontal: theme.spacing.lg,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  itemWrap: {
    gap: theme.spacing.xs,
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
});
