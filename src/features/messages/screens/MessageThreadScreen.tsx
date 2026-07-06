import React, { useEffect, useMemo, useState } from "react";
import { Alert, Animated, FlatList, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

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
import { useTabMessageKeyboardLayout } from "../../../hooks/useTabMessageKeyboardLayout";
import type { MessagesStackParamList } from "../../../navigation/types";
import { blockUser } from "../../profile/services/block.service";
import { MessageBubble } from "../components/MessageBubble";
import { MessageComposer } from "../components/MessageComposer";
import { useMessageThreadListScroll } from "../hooks/useMessageThreadListScroll";
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
  const { isKeyboardVisible, keyboardPadding, restingBottomInset } = useTabMessageKeyboardLayout();
  const [conversation, setConversation] = useState<ConversationThread | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingGreeting, setIsSendingGreeting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    listRef,
    handleContentSizeChange,
    onInitialMessagesReady,
    onOwnMessageSent,
    resetForThread,
  } = useMessageThreadListScroll(messages);

  const viewerId = user?.id ?? "";

  useEffect(() => {
    resetForThread();
    setConversation(null);
    setMessages([]);
    setError(null);
    void loadThread();
  }, [route.params.threadId]);

  useEffect(() => {
    onInitialMessagesReady(isLoading);
  }, [isLoading, messages.length, onInitialMessagesReady]);

  const loadThread = async () => {
    setIsLoading(true);
    let loadedThread: ConversationThread | null = null;

    try {
      const [thread, threadMessages] = await Promise.all([
        getConversationById(route.params.threadId),
        getMessages(route.params.threadId),
      ]);
      loadedThread = thread;
      setConversation(thread);
      setMessages(threadMessages.messages);
      setError(null);
    } catch {
      setConversation(null);
      setMessages([]);
      setError("Sohbet yüklenemedi.");
    } finally {
      setIsLoading(false);
    }

    if (loadedThread) {
      void markConversationRead(route.params.threadId).catch(() => undefined);
    }
  };

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
    onOwnMessageSent();
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
  const isRequestPending = conversation?.metadata?.isRequestPending === "true";
  const participant = useMemo(() => otherParticipant(conversation, viewerId), [conversation, viewerId]);
  const initials = isSystemInbox ? "T" : (participant?.displayName || title).slice(0, 2).toUpperCase();
  const timeLabel = useMemo(() => formatThreadTime(messages), [messages]);

  const hideRequestAndGoBack = () => {
    navigation.navigate(MessagesRoutes.MessageRequestsScreen, { hideThreadId: route.params.threadId });
  };

  const confirmDeleteRequest = () => {
    Alert.alert("İsteği sil", "Bu mesaj isteği listeden kaldırılacak.", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: hideRequestAndGoBack,
      },
    ]);
  };

  const confirmBlockRequester = () => {
    if (!participant) {
      return;
    }

    Alert.alert(
      "Kullanıcıyı engelle",
      `${participant.displayName} engellensin mi? Bu kişiyle mesajlaşamazsınız.`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Engelle",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await blockUser(participant.id);
                navigation.navigate(MessagesRoutes.MessagesInboxScreen);
              } catch (blockError) {
                const message = blockError instanceof Error ? blockError.message : "Engelleme başarısız.";
                Alert.alert("Hata", message);
              }
            })();
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <Loader label="Sohbet yükleniyor..." />
        </Card>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <ErrorState onRetry={() => void loadThread()} subtitle={error} title="Sohbet yüklenemedi" />
        </Card>
      </Screen>
    );
  }

  if (!conversation) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <EmptyState subtitle="Bu sohbet artık mevcut olmayabilir." title="Sohbet bulunamadı" />
        </Card>
      </Screen>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
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

        {isRequestPending && participant ? (
          <View style={styles.requestBanner}>
            <AppText style={styles.requestBannerText} variant="caption">
              {participant.displayName} sana mesaj göndermek istiyor
            </AppText>
            <View style={styles.requestActions}>
              <Pressable onPress={confirmDeleteRequest} style={styles.requestActionButton}>
                <AppText style={styles.requestDeleteText} variant="label">
                  Sil
                </AppText>
              </Pressable>
              <Pressable onPress={confirmBlockRequester} style={styles.requestActionButton}>
                <AppText style={styles.requestBlockText} variant="label">
                  Engelle
                </AppText>
              </Pressable>
            </View>
          </View>
        ) : null}

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
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={handleContentSizeChange}
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
          <Animated.View style={{ paddingBottom: keyboardPadding }}>
            <View
              style={[styles.composerWrap, !isKeyboardVisible ? { paddingBottom: restingBottomInset } : null]}
            >
              <MessageComposer disabled={!user} onSend={onSend} />
            </View>
          </Animated.View>
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
  requestBanner: {
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderBottomColor: "#FDE68A",
    borderBottomWidth: 1,
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  requestBannerText: {
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  requestActions: {
    flexDirection: "row",
    gap: theme.spacing.lg,
  },
  requestActionButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  requestDeleteText: {
    color: theme.colors.textSecondary,
  },
  requestBlockText: {
    color: "#DC2626",
    fontWeight: "600",
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
