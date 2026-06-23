import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { Screen } from "../../../components/ui/Screen";
import { MessagesRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { MessagesStackParamList } from "../../../navigation/types";
import { MessageBubble } from "../components/MessageBubble";
import { MessageComposer } from "../components/MessageComposer";
import { getConversationById, getMessages, markConversationRead, sendMessage } from "../services/messages.service";
import type { ConversationMessage, ConversationThread } from "../types";

type Props = NativeStackScreenProps<MessagesStackParamList, "MessageThreadScreen">;

const threadTitle = (conversation: ConversationThread | null, viewerId: string) => {
  if (!conversation) {
    return "Conversation";
  }
  if (conversation.metadata?.isSystemInbox === "true") {
    return "Tourist";
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

const otherParticipant = (conversation: ConversationThread | null, viewerId: string) => {
  if (!conversation) {
    return null;
  }

  return conversation.participants.find((participant) => participant.id !== viewerId) ?? null;
};

const formatThreadTime = (messages: ConversationMessage[]) => {
  const firstMessage = messages.find((message) => message.type !== "system") ?? messages[0];
  if (!firstMessage) {
    return "";
  }

  const date = new Date(firstMessage.createdAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export function MessageThreadScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ConversationThread | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingGreeting, setIsSendingGreeting] = useState(false);
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
      setMessages(threadMessages.messages);
      setError(null);
      if (thread) {
        await markConversationRead(route.params.threadId);
      }
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
        displayName: user.publicProfile.displayName || user.publicProfile.username || "Tourist Member",
      },
      text,
    });

    if (!next) {
      return;
    }

    const nextMessages = await getMessages(route.params.threadId);
    setMessages(nextMessages.messages);
    const nextThread = await getConversationById(route.params.threadId);
    setConversation(nextThread);
  };
  const onSendGreeting = async () => {
    if (isSendingGreeting) {
      return;
    }
    setIsSendingGreeting(true);
    try {
      await onSend("👋");
    } finally {
      setIsSendingGreeting(false);
    }
  };

  const title = useMemo(() => threadTitle(conversation, viewerId), [conversation, viewerId]);
  const isSystemInbox = conversation?.metadata?.isSystemInbox === "true";
  const participant = useMemo(() => otherParticipant(conversation, viewerId), [conversation, viewerId]);
  const initials = isSystemInbox ? "T" : (participant?.displayName || title).slice(0, 2).toUpperCase();
  const timeLabel = useMemo(() => formatThreadTime(messages), [messages]);

  if (isLoading) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <Loader label="Loading thread..." />
        </Card>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <ErrorState onRetry={() => void loadThread()} title="Could not load thread" subtitle={error} />
        </Card>
      </Screen>
    );
  }

  if (!conversation) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <EmptyState title="Thread not found" subtitle="This conversation may no longer exist." />
        </Card>
      </Screen>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.navigate(MessagesRoutes.MessagesInboxScreen)} style={styles.backButton}>
            <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={30} />
          </Pressable>

          <View style={styles.identity}>
            <View style={styles.avatarWrap}>
              <Avatar initials={initials} size={52} uri={isSystemInbox ? undefined : participant?.avatarUrl} />
              {!isSystemInbox ? <View style={styles.onlineDot} /> : null}
            </View>
            <View>
              <AppText style={styles.title} numberOfLines={1} variant="label">
                {title}
              </AppText>
              <AppText style={styles.onlineText} variant="caption">
                {isSystemInbox ? "Sistem bildirimi" : "Online"}
              </AppText>
            </View>
          </View>

          <View style={styles.headerActions}>
            <Pressable style={styles.moreButton}>
              <Ionicons color={theme.colors.muted} name="ellipsis-horizontal" size={24} />
            </Pressable>
          </View>
        </View>

        <View style={styles.messagesArea}>
          {messages.length === 0 ? (
            <Card style={styles.stateCard}>
              <Pressable
                disabled={isSendingGreeting}
                onPress={() => void onSendGreeting()}
                style={styles.greetingStateButton}
              >
                <AppText style={styles.greetingEmoji} variant="body">
                  👋
                </AppText>
                <AppText style={styles.greetingText} variant="body">
                  Merhaba deyin!
                </AppText>
              </Pressable>
            </Card>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <MessageBubble isMine={item.sender.id === viewerId} message={item} />}
              ListHeaderComponent={
                timeLabel ? (
                  <View style={styles.timePill}>
                    <AppText style={styles.timePillText} variant="caption">
                      {timeLabel}
                    </AppText>
                  </View>
                ) : null
              }
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
        {!isSystemInbox ? (
          <View style={styles.composerWrap}>
            <MessageComposer disabled={!user} onSend={onSend} />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  container: {
    backgroundColor: "#F7F8FA",
    flex: 1,
  },
  header: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 88,
    paddingHorizontal: theme.spacing.md,
  },
  backButton: {
    marginRight: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  identity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  avatarWrap: {
    position: "relative",
  },
  onlineDot: {
    backgroundColor: "#18D66B",
    borderColor: "#FFFFFF",
    borderRadius: 7,
    borderWidth: 2,
    bottom: 1,
    height: 14,
    position: "absolute",
    right: 1,
    width: 14,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 18,
  },
  onlineText: {
    color: "#16A34A",
    fontWeight: "600",
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    marginLeft: theme.spacing.sm,
  },
  moreButton: {
    alignItems: "center",
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  messagesArea: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  timePill: {
    alignSelf: "center",
    backgroundColor: "#E5E7EB",
    borderRadius: 16,
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  timePillText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  composerWrap: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  stateCard: {
    flex: 1,
    justifyContent: "center",
  },
  greetingStateButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  greetingEmoji: {
    fontSize: 64,
    lineHeight: 74,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  greetingText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
});
