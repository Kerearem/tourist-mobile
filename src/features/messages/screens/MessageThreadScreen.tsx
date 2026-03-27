import React, { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppText } from "../../../components/ui/AppText";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { Screen } from "../../../components/ui/Screen";
import { useAuth } from "../../../hooks/useAuth";
import type { MessagesStackParamList } from "../../../navigation/types";
import { MessageBubble } from "../components/MessageBubble";
import { MessageComposer } from "../components/MessageComposer";
import { getConversationById, getMessages, sendMessage } from "../services/messages.service";
import type { ConversationMessage, ConversationThread } from "../types";

type Props = NativeStackScreenProps<MessagesStackParamList, "MessageThreadScreen">;

const threadTitle = (conversation: ConversationThread | null, viewerId: string) => {
  if (!conversation) {
    return "Conversation";
  }
  if (conversation.title) {
    return conversation.title;
  }

  const otherParticipants = conversation.participants.filter((item) => item.id !== viewerId);
  if (otherParticipants.length === 0) {
    return "Conversation";
  }

  return otherParticipants.map((item) => item.displayName).join(", ");
};

export function MessageThreadScreen({ route }: Props) {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ConversationThread | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const viewerId = user?.id ?? "";

  const loadThread = async () => {
    setIsLoading(true);
    try {
      const [thread, threadMessages] = await Promise.all([
        getConversationById(route.params.threadId),
        getMessages(route.params.threadId),
      ]);
      setConversation(thread);
      setMessages(threadMessages);
      setError(null);
    } catch {
      setConversation(null);
      setMessages([]);
      setError("Failed to load thread.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadThread();
  }, [route.params.threadId]);

  const onSend = async (text: string) => {
    if (!user) {
      return;
    }

    const next = await sendMessage({
      threadId: route.params.threadId,
      sender: {
        id: user.id,
        displayName: user.displayName,
      },
      text,
    });

    if (!next) {
      return;
    }

    const nextMessages = await getMessages(route.params.threadId);
    setMessages(nextMessages);
    const nextThread = await getConversationById(route.params.threadId);
    setConversation(nextThread);
  };

  const title = useMemo(() => threadTitle(conversation, viewerId), [conversation, viewerId]);

  if (isLoading) {
    return (
      <Screen>
        <Loader label="Loading thread..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState title="Could not load thread" subtitle={error} />
      </Screen>
    );
  }

  if (!conversation) {
    return (
      <Screen>
        <EmptyState title="Thread not found" subtitle="This conversation may no longer exist." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <AppText style={styles.title}>{title}</AppText>
        <View style={styles.messagesArea}>
          {messages.length === 0 ? (
            <EmptyState title="No messages yet" subtitle="Send the first message." />
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <MessageBubble isMine={item.sender.id === viewerId} message={item} />}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
        <MessageComposer disabled={!user} onSend={onSend} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  messagesArea: {
    flex: 1,
  },
});
