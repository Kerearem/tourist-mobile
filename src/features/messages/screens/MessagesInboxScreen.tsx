import React, { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, TextInput, View } from "react-native";
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
import { getConversations } from "../services/messages.service";
import type { ConversationThread } from "../types";

type Props = NativeStackScreenProps<MessagesStackParamList, "MessagesInboxScreen">;

export function MessagesInboxScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<ConversationThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const viewerId = user?.id ?? "";

  const visibleConversations = useMemo(() => {
    if (!viewerId) {
      return [];
    }
    return items.filter((thread) => thread.participants.some((participant) => participant.id === viewerId));
  }, [items, viewerId]);

  const loadData = async (mode: "initial" | "refresh") => {
    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const data = await getConversations();
      setItems(data);
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

  if (isLoading) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <Loader label="Loading conversations..." />
        </Card>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <ErrorState onRetry={() => void loadData("initial")} title="Could not load inbox" subtitle={error} />
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
          <AppText style={styles.requestsText} variant="label">
            İstekler
          </AppText>
        </View>

        <View style={styles.searchBar}>
          <Ionicons color={theme.colors.muted} name="search" size={22} />
          <TextInput
            onChangeText={setSearchText}
            placeholder="Search messages..."
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
                    Swipe down to refresh
                  </AppText>
                </View>
              </View>
            }
            onRefresh={() => void loadData("refresh")}
            refreshing={refreshing}
            renderItem={({ item, index }) => (
              <ConversationListItem
                conversation={item}
                isOnline={index === 0}
                onPress={() => navigation.navigate(MessagesRoutes.MessageThreadScreen, { threadId: item.id })}
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
  requestsText: {
    color: theme.colors.textSecondary,
    fontSize: 17,
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
