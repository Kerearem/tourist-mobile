import React, { useEffect, useMemo, useState } from "react";
import { FlatList } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { Screen } from "../../../components/ui/Screen";
import { MessagesRoutes } from "../../../constants/routes";
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

  if (isLoading) {
    return (
      <Screen>
        <Loader label="Loading conversations..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState title="Could not load inbox" subtitle={error} />
      </Screen>
    );
  }

  return (
    <Screen>
      {visibleConversations.length === 0 ? (
        <EmptyState title="No conversations yet" subtitle="Help others or start a direct chat later." />
      ) : (
        <FlatList
          data={visibleConversations}
          keyExtractor={(item) => item.id}
          onRefresh={() => void loadData("refresh")}
          refreshing={refreshing}
          renderItem={({ item }) => (
            <ConversationListItem
              conversation={item}
              onPress={() => navigation.navigate(MessagesRoutes.MessageThreadScreen, { threadId: item.id })}
              viewerId={viewerId}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}
