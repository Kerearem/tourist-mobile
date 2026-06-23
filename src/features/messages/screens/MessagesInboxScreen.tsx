import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { Screen } from "../../../components/ui/Screen";
import { MessagesRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { MessagesStackParamList } from "../../../navigation/types";
import { archiveEventGroup } from "../../events/services/eventGroup.service";
import { getEventById, toggleEventAttendance } from "../../events/services/events.service";
import { ConversationListItem } from "../components/ConversationListItem";
import { getConversations, getMessageRequests } from "../services/messages.service";
import type { ConversationThread } from "../types";

type Props = NativeStackScreenProps<MessagesStackParamList, "MessagesInboxScreen">;

export function MessagesInboxScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<ConversationThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [mutedIds, setMutedIds] = useState<Set<string>>(new Set());
  const [requestCount, setRequestCount] = useState(0);

  const viewerId = user?.id ?? "";

  const visibleConversations = useMemo(() => {
    if (!viewerId) {
      return [];
    }
    return items.filter(
      (thread) =>
        !hiddenIds.has(thread.id) && thread.participants.some((participant) => participant.id === viewerId),
    );
  }, [hiddenIds, items, viewerId]);

  const loadData = async (mode: "initial" | "refresh") => {
    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [data, requests] = await Promise.all([getConversations(), getMessageRequests()]);
      setItems(data);
      setRequestCount(requests.length);
      setError(null);
    } catch {
      setItems([]);
      setError("Failed to load conversations.");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData("initial");
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      void loadData("refresh");
      return undefined;
    }, []),
  );

  const hideConversation = (conversationId: string) => {
    setHiddenIds((prev) => new Set(prev).add(conversationId));
  };

  const toggleMute = (conversationId: string) => {
    setMutedIds((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) {
        next.delete(conversationId);
      } else {
        next.add(conversationId);
      }
      return next;
    });
  };

  const confirmLeaveEventGroup = (conversation: ConversationThread) => {
    const eventId = conversation.metadata?.eventId;
    if (!eventId || !user) {
      return;
    }

    void (async () => {
      let selfLeaveCount = 0;
      try {
        const event = await getEventById(eventId);
        selfLeaveCount = Number(event?.metadata?.selfLeaveCount ?? 0);
      } catch {
        // proceed without warning if event fetch fails
      }

      const warning =
        selfLeaveCount >= 1
          ? "Bir kez daha ayrılırsan bu etkinliğe tekrar katılamazsın."
          : null;

      Alert.alert(
        "Etkinlikten ayrıl",
        ["Gruptan çıkmak, etkinlikten de ayrılmak demektir. Emin misin?", warning].filter(Boolean).join("\n\n"),
        [
          { text: "Vazgeç", style: "cancel" },
          {
            text: "Ayrıl",
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  await toggleEventAttendance({ eventId, userId: user.id });
                  hideConversation(conversation.id);
                  void loadData("refresh");
                } catch (leaveError) {
                  const message =
                    leaveError instanceof Error ? leaveError.message : "Etkinlikten ayrılamadın.";
                  Alert.alert("Hata", message);
                }
              })();
            },
          },
        ],
      );
    })();
  };

  const confirmDeleteConversation = (conversation: ConversationThread) => {
    if (conversation.type === "group" && conversation.metadata?.eventId) {
      confirmLeaveEventGroup(conversation);
      return;
    }

    Alert.alert("Sohbeti sil", "Bu sohbet listenizden kaldırılacak.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => hideConversation(conversation.id),
      },
    ]);
  };

  const handleArchive = (conversation: ConversationThread) => {
    const eventId = conversation.metadata?.eventId;
    if (!eventId) {
      hideConversation(conversation.id);
      return;
    }

    const isOrganizer = conversation.metadata?.viewerRole === "ORGANIZER";
    if (isOrganizer) {
      Alert.alert(
        "Grubu Arşivle",
        "Arşivlenen grupta kimse yeni mesaj gönderemez. Eski mesajlar okunabilir kalır.",
        [
          { text: "Vazgeç", style: "cancel" },
          {
            text: "Arşivle",
            onPress: () => {
              void archiveEventGroup(eventId)
                .then(() => void loadData("refresh"))
                .catch(() => {
                  Alert.alert("Hata", "Grup arşivlenemedi.");
                });
            },
          },
        ],
      );
      return;
    }

    hideConversation(conversation.id);
  };

  if (isLoading) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <Loader label="Mesajlar yükleniyor..." />
        </Card>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <ErrorState onRetry={() => void loadData("initial")} subtitle={error} title="Mesajlar yüklenemedi" />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText style={styles.title} variant="title">
            Mesajlar
          </AppText>
          <Pressable
            onPress={() => navigation.navigate(MessagesRoutes.MessageRequestsScreen)}
            style={styles.requestsButton}
          >
            <AppText style={styles.requestsText} variant="label">
              İstekler
            </AppText>
            {requestCount > 0 ? (
              <View style={styles.requestsBadge}>
                <AppText style={styles.requestsBadgeText} variant="caption">
                  {requestCount > 99 ? "99+" : String(requestCount)}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <Ionicons color={theme.colors.muted} name="search" size={22} />
          <TextInput
            onChangeText={setSearchText}
            placeholder="Mesajlarda ara..."
            placeholderTextColor={theme.colors.muted}
            style={styles.searchInput}
            value={searchText}
          />
        </View>

        <View style={styles.listWrap}>
          <FlatList
            alwaysBounceVertical
            bounces
            contentContainerStyle={visibleConversations.length === 0 ? styles.emptyListContent : styles.listContent}
            data={visibleConversations}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.emptyStateContainer}>
                <View style={styles.refreshHintWrap}>
                  <Ionicons color={theme.colors.muted} name="refresh-outline" size={56} />
                  <AppText muted style={styles.refreshHintText} variant="bodyMuted">
                    Yenilemek için aşağı kaydırın
                  </AppText>
                </View>
              </View>
            }
            onRefresh={() => void loadData("refresh")}
            refreshing={refreshing}
            renderItem={({ item, index }) => (
              <ConversationListItem
                conversation={item}
                isMuted={mutedIds.has(item.id)}
                isOnline={index === 0 && item.type === "direct"}
                onArchive={() => handleArchive(item)}
                onDelete={() => confirmDeleteConversation(item)}
                onMute={() => toggleMute(item.id)}
                onPress={() => {
                  if (item.type === "group" && item.metadata?.eventId) {
                    navigation.navigate(MessagesRoutes.GroupDetailScreen, {
                      eventId: item.metadata.eventId,
                      conversationId: item.id,
                    });
                    return;
                  }
                  navigation.navigate(MessagesRoutes.MessageThreadScreen, { threadId: item.id });
                }}
                viewerId={viewerId}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: theme.spacing.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: theme.spacing.md,
  },
  title: {
    color: theme.colors.textPrimary,
  },
  requestsButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  requestsText: {
    color: theme.colors.textSecondary,
    fontSize: 17,
  },
  requestsBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 20,
    minWidth: 20,
    paddingHorizontal: 6,
  },
  requestsBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  searchBar: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 15,
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 46,
    paddingHorizontal: theme.spacing.md,
  },
  searchInput: {
    color: theme.colors.textPrimary,
    flex: 1,
    ...theme.typography.body,
  },
  listWrap: {
    flex: 1,
  },
  listContent: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
    minHeight: 420,
    paddingBottom: theme.spacing.xl,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
  },
  stateCard: {
    flex: 1,
    justifyContent: "center",
  },
  refreshHintWrap: {
    alignItems: "center",
    gap: theme.spacing.md,
    justifyContent: "center",
  },
  refreshHintText: {
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});
