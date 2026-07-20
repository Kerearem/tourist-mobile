import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
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
import { ConversationListItem } from "../components/ConversationListItem";
import { useMessagesRealtime } from "../hooks/useMessagesRealtime";
import { getMessageRequests } from "../services/messages.service";
import type { ConversationThread } from "../types";
import { unhideConversationId } from "../utils/inboxHiddenConversations";
import { applyRequestConversationRealtimeUpdate } from "../utils/requestInboxRealtime";

type Props = NativeStackScreenProps<MessagesStackParamList, "MessageRequestsScreen">;

export function MessageRequestsScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<ConversationThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const viewerId = user?.id ?? "";

  const visibleRequests = useMemo(
    () => items.filter((thread) => !hiddenIds.has(thread.id)),
    [hiddenIds, items],
  );

  const loadData = async (mode: "initial" | "refresh") => {
    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const data = await getMessageRequests();
      setItems(data);
      setError(null);
    } catch {
      setItems([]);
      setError("İstekler yüklenemedi.");
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
      const hideThreadId = route.params?.hideThreadId;
      if (hideThreadId) {
        setHiddenIds((prev) => new Set(prev).add(hideThreadId));
        navigation.setParams({ hideThreadId: undefined });
      }
      void loadData("refresh");
      return undefined;
    }, [navigation, route.params?.hideThreadId]),
  );

  useMessagesRealtime({
    onConversationUpdated: (event) => {
      const conversation = event.payload.conversation;
      setHiddenIds((prev) => unhideConversationId(prev, conversation.id));
      setItems((current) => applyRequestConversationRealtimeUpdate(current, conversation));
    },
    onMessageNew: (event) => {
      setHiddenIds((prev) => unhideConversationId(prev, event.payload.conversationId));
    },
    onReconnect: () => {
      void loadData("refresh");
    },
  });

  if (isLoading) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <Loader label="İstekler yükleniyor..." />
        </Card>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <ErrorState onRetry={() => void loadData("initial")} subtitle={error} title="Yüklenemedi" />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={28} />
          </Pressable>
          <AppText style={styles.title} variant="title">
            İstekler
          </AppText>
          <View style={styles.headerSpacer} />
        </View>

        <FlatList
          alwaysBounceVertical
          bounces
          contentContainerStyle={
            visibleRequests.length === 0 ? styles.emptyListContent : styles.listContent
          }
          data={visibleRequests}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <AppText muted variant="bodyMuted">
                Bekleyen mesaj isteği yok.
              </AppText>
            </View>
          }
          onRefresh={() => void loadData("refresh")}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <ConversationListItem
              conversation={item}
              onDelete={() => setHiddenIds((prev) => new Set(prev).add(item.id))}
              onPress={() => {
                navigation.navigate(MessagesRoutes.MessageThreadScreen, { threadId: item.id });
              }}
              viewerId={viewerId}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
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
    paddingTop: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  title: {
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 44,
  },
  listContent: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  emptyListContent: {
    flexGrow: 1,
    minHeight: 320,
    paddingBottom: theme.spacing.xl,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingTop: theme.spacing.xxl,
  },
  stateCard: {
    flex: 1,
    justifyContent: "center",
  },
});
