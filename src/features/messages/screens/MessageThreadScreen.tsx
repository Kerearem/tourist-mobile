import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, FlatList, Pressable, StyleSheet, Vibration, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
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
import { MessageActionSheet } from "../components/MessageActionSheet";
import { MessageComposer } from "../components/MessageComposer";
import { useMessageThreadListScroll } from "../hooks/useMessageThreadListScroll";
import { useMessagesRealtime } from "../hooks/useMessagesRealtime";
import {
  getConversationById,
  getMessages,
  markConversationRead,
  deleteMessage,
  removeMessageReaction,
  sendMessage,
  setMessageReaction,
} from "../services/messages.service";
import type {
  AllowedMessageReaction,
  ConversationMessage,
  ConversationThread,
} from "../types";
import { canOpenConversationInfo, resolveConversationInfoNavigation } from "../utils/conversationInfoNavigation";
import { appendMessageDeduped } from "../utils/threadRealtime";
import {
  applyMessageReceiptUpdates,
  applyMessageReactionUpdate,
  applyMessageUpdated,
  isConsecutiveSameSender,
  shouldShowIncomingDmAvatar,
} from "../utils/messageReceipts";
import { formatMessageDayLabel, shouldShowDaySeparator } from "../utils/messageDaySeparators";
import {
  appendCachedThreadMessage,
  getCachedThread,
  patchCachedThreadConversation,
  patchCachedThreadMessageUpdated,
  patchCachedThreadReaction,
  patchCachedThreadReceipts,
  setCachedThread,
} from "../cache/messagesSessionCache";
import {
  resolveThreadLoadMode,
  shouldClearThreadOnLoadError,
  shouldSetThreadLoadingState,
  shouldShowThreadFullScreenError,
  shouldShowThreadFullScreenLoader,
  type ThreadLoadMode,
} from "../utils/threadLoadPresentation";

type Props = NativeStackScreenProps<MessagesStackParamList, "MessageThreadScreen">;

const NEAR_BOTTOM_THRESHOLD = 120;

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

export function MessageThreadScreen({ route, navigation }: Props) {
  const { user } = useAuth();
  const { isKeyboardVisible, keyboardPadding, restingBottomInset } = useTabMessageKeyboardLayout();
  const initialCache = getCachedThread(route.params.threadId);
  const [conversation, setConversation] = useState<ConversationThread | null>(
    initialCache?.conversation ?? null,
  );
  const [messages, setMessages] = useState<ConversationMessage[]>(initialCache?.messages ?? []);
  const [isLoading, setIsLoading] = useState(!initialCache);
  const [isSendingGreeting, setIsSendingGreeting] = useState(false);
  const [actionMessage, setActionMessage] = useState<ConversationMessage | null>(null);
  const [replyTarget, setReplyTarget] = useState<ConversationMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeThreadIdRef = useRef(route.params.threadId);
  const isNearBottomRef = useRef(true);
  const isFocusedRef = useRef(false);

  const {
    listRef,
    handleContentSizeChange,
    onInitialMessagesReady,
    onOwnMessageSent,
    onIncomingMessage,
    resetForThread,
  } = useMessageThreadListScroll(messages);

  const viewerId = user?.id ?? "";
  const hasCachedThread =
    Boolean(conversation) || messages.length > 0 || Boolean(getCachedThread(route.params.threadId));

  useEffect(() => {
    activeThreadIdRef.current = route.params.threadId;
  }, [route.params.threadId]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      return () => {
        isFocusedRef.current = false;
      };
    }, []),
  );

  useEffect(() => {
    resetForThread();
    const cached = getCachedThread(route.params.threadId);
    setConversation(cached?.conversation ?? null);
    setMessages(cached?.messages ?? []);
    setActionMessage(null);
    setReplyTarget(null);
    setError(null);
    void loadThread(route.params.threadId, resolveThreadLoadMode(Boolean(cached)));
  }, [route.params.threadId]);

  useEffect(() => {
    onInitialMessagesReady(isLoading && !hasCachedThread);
  }, [hasCachedThread, isLoading, messages.length, onInitialMessagesReady]);

  const loadThread = async (
    threadId = route.params.threadId,
    mode: ThreadLoadMode = resolveThreadLoadMode(Boolean(getCachedThread(threadId))),
  ) => {
    const hasCache = Boolean(getCachedThread(threadId));
    if (shouldSetThreadLoadingState(mode, hasCache)) {
      setIsLoading(true);
    }

    let loadedThread: ConversationThread | null = null;

    try {
      const [thread, threadMessages] = await Promise.all([
        getConversationById(threadId),
        getMessages(threadId),
      ]);

      if (activeThreadIdRef.current !== threadId) {
        return;
      }

      loadedThread = thread;
      setConversation(thread);
      setMessages(threadMessages.messages);
      setCachedThread(threadId, {
        conversation: thread,
        messages: threadMessages.messages,
        pinnedMessage: threadMessages.pinnedMessage,
      });
      setError(null);
    } catch {
      if (activeThreadIdRef.current !== threadId) {
        return;
      }

      if (shouldClearThreadOnLoadError(hasCache)) {
        setConversation(null);
        setMessages([]);
        setError("Sohbet yüklenemedi.");
      }
    } finally {
      if (activeThreadIdRef.current === threadId) {
        setIsLoading(false);
      }
    }

    if (loadedThread && activeThreadIdRef.current === threadId) {
      void markConversationRead(threadId).catch(() => undefined);
    }
  };

  useMessagesRealtime({
    onMessageNew: (event) => {
      const { conversationId, message } = event.payload;
      if (conversationId !== activeThreadIdRef.current) {
        return;
      }

      setMessages((current) => appendMessageDeduped(current, message));
      appendCachedThreadMessage(conversationId, message);

      if (message.sender.id !== viewerId) {
        onIncomingMessage(isNearBottomRef.current);

        if (isFocusedRef.current) {
          void markConversationRead(conversationId).catch(() => undefined);
        }
      }
    },
    onConversationUpdated: (event) => {
      if (event.payload.conversation.id !== activeThreadIdRef.current) {
        return;
      }

      setConversation(event.payload.conversation);
      patchCachedThreadConversation(event.payload.conversation.id, event.payload.conversation);
    },
    onMessageReceipts: (event) => {
      if (event.payload.conversationId !== activeThreadIdRef.current) {
        return;
      }

      setMessages((current) => applyMessageReceiptUpdates(current, event.payload.updates));
      patchCachedThreadReceipts(event.payload.conversationId, event.payload.updates);
    },
    onMessageReaction: (event) => {
      if (event.payload.conversationId !== activeThreadIdRef.current) {
        return;
      }

      setMessages((current) =>
        applyMessageReactionUpdate(
          current,
          event.payload.messageId,
          event.payload.reactions,
        ),
      );
      patchCachedThreadReaction(
        event.payload.conversationId,
        event.payload.messageId,
        event.payload.reactions,
      );
    },
    onMessageUpdated: (event) => {
      if (event.payload.conversationId !== activeThreadIdRef.current) {
        return;
      }

      setMessages((current) => applyMessageUpdated(current, event.payload.message));
      patchCachedThreadMessageUpdated(event.payload.conversationId, event.payload.message);
    },
    onReconnect: () => {
      void loadThread(activeThreadIdRef.current, "silent");
    },
  });

  const onSend = async (text: string) => {
    if (!user) {
      return;
    }

    const sentMessage = await sendMessage({
      threadId: route.params.threadId,
      sender: {
        id: user.id,
        displayName: user.publicProfile.displayName || user.publicProfile.username || "Tourist Member",
      },
      text,
      replyToMessageId: replyTarget?.id,
    });

    if (!sentMessage || activeThreadIdRef.current !== route.params.threadId) {
      return;
    }

    setMessages((current) => appendMessageDeduped(current, sentMessage));
    appendCachedThreadMessage(route.params.threadId, sentMessage);
    setReplyTarget(null);
    onOwnMessageSent();
    setConversation((current) => {
      if (!current) {
        return current;
      }
      const next = {
        ...current,
        lastMessageAt: sentMessage.createdAt,
        lastMessagePreview: sentMessage.text || "📷 Fotoğraf",
        updatedAt: sentMessage.createdAt,
        unreadCount: 0,
      };
      patchCachedThreadConversation(route.params.threadId, next);
      return next;
    });
  };

  const chooseReply = (message: ConversationMessage) => {
    setActionMessage(null);
    if (message.isDeleted) {
      return;
    }
    setReplyTarget(message);
  };

  const chooseReaction = async (
    message: ConversationMessage,
    emoji: AllowedMessageReaction,
  ) => {
    setActionMessage(null);
    if (message.isDeleted) {
      return;
    }
    try {
      const alreadySelected = message.reactions?.some(
        (reaction) => reaction.emoji === emoji && reaction.reactedByMe,
      );
      const reactions = alreadySelected
        ? await removeMessageReaction(route.params.threadId, message.id)
        : await setMessageReaction(route.params.threadId, message.id, emoji);
      setMessages((current) => applyMessageReactionUpdate(current, message.id, reactions));
      patchCachedThreadReaction(route.params.threadId, message.id, reactions);
    } catch (reactionError) {
      Alert.alert(
        "Tepki eklenemedi",
        reactionError instanceof Error ? reactionError.message : "Lütfen tekrar deneyin.",
      );
    }
  };

  const copyMessage = async (message: ConversationMessage) => {
    setActionMessage(null);
    const copyValue = message.text?.trim() || "";
    if (!copyValue || message.isDeleted) {
      return;
    }

    try {
      await Clipboard.setStringAsync(copyValue);
      Vibration.vibrate(10);
    } catch {
      Alert.alert("Kopyalanamadı", "Mesaj panoya kopyalanamadı. Lütfen tekrar dene.");
    }
  };

  const confirmDeleteMessage = (message: ConversationMessage) => {
    setActionMessage(null);
    if (message.sender.id !== viewerId || message.isDeleted) {
      return;
    }

    Alert.alert("Mesajı sil", "Bu mesaj sohbetten silinsin mi?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              const updated = await deleteMessage(route.params.threadId, message.id);
              if (updated) {
                setMessages((current) => applyMessageUpdated(current, updated));
                patchCachedThreadMessageUpdated(route.params.threadId, updated);
              }
            } catch (deleteError) {
              Alert.alert(
                "Mesaj silinemedi",
                deleteError instanceof Error ? deleteError.message : "Lütfen tekrar dene.",
              );
            }
          })();
        },
      },
    ]);
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

  const openConversationInfo = () => {
    if (!canOpenConversationInfo()) {
      return;
    }

    const target = resolveConversationInfoNavigation(route.params.threadId);
    navigation.navigate(target.screen, target.params);
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

  if (shouldShowThreadFullScreenLoader(isLoading, hasCachedThread)) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <Loader label="Sohbet yükleniyor..." />
        </Card>
      </Screen>
    );
  }

  if (shouldShowThreadFullScreenError(error, hasCachedThread)) {
    return (
      <Screen>
        <Card style={styles.stateCard}>
          <ErrorState onRetry={() => void loadThread()} subtitle={error ?? undefined} title="Sohbet yüklenemedi" />
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

          <Pressable
            accessibilityRole="button"
            onPress={openConversationInfo}
            style={({ pressed }) => [styles.identity, pressed && styles.identityPressed]}
          >
            <Avatar initials={initials} size={52} uri={isSystemInbox ? undefined : participant?.avatarUrl} />
            <View>
              <AppText style={styles.title} numberOfLines={1} variant="label">
                {title}
              </AppText>
              {isSystemInbox ? (
                <AppText style={styles.subtitleText} variant="caption">
                  Sistem bildirimi
                </AppText>
              ) : null}
            </View>
          </Pressable>

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
              onScroll={(event) => {
                const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                const distanceFromBottom =
                  contentSize.height - layoutMeasurement.height - contentOffset.y;
                isNearBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
              }}
              scrollEventThrottle={16}
              renderItem={({ item, index }) => {
                const previousMessage = index > 0 ? messages[index - 1] : null;
                const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
                const daySeparatorLabel = shouldShowDaySeparator(item, previousMessage)
                  ? formatMessageDayLabel(item.createdAt)
                  : "";
                return (
                  <>
                    {daySeparatorLabel ? (
                      <View style={styles.daySeparatorPill}>
                        <AppText style={styles.daySeparatorText} variant="caption">
                          {daySeparatorLabel}
                        </AppText>
                      </View>
                    ) : null}
                    <MessageBubble
                      isClusterContinuation={
                        isConsecutiveSameSender(item, previousMessage) && !daySeparatorLabel
                      }
                      isHiddenForActionSheet={actionMessage?.id === item.id}
                      isMine={item.sender.id === viewerId}
                      message={item}
                      onLongPress={
                        item.type === "system" || item.isDeleted
                          ? undefined
                          : () => setActionMessage(item)
                      }
                      showIncomingAvatar={shouldShowIncomingDmAvatar({
                        message: item,
                        nextMessage,
                        viewerId,
                      })}
                    />
                  </>
                );
              }}
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
              <MessageComposer
                textOnly
                disabled={!user}
                onCancelReply={() => setReplyTarget(null)}
                onSend={onSend}
                replyTarget={replyTarget}
              />
            </View>
          </Animated.View>
        ) : null}
      </View>
      <MessageActionSheet
        isMine={actionMessage?.sender.id === viewerId}
        message={actionMessage}
        onClose={() => setActionMessage(null)}
        onCopy={(message) => void copyMessage(message)}
        onDelete={confirmDeleteMessage}
        onReaction={(message, emoji) => void chooseReaction(message, emoji)}
        onReply={chooseReply}
      />
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
  identityPressed: {
    opacity: 0.7,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 18,
  },
  subtitleText: {
    color: theme.colors.textSecondary,
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
  daySeparatorPill: {
    alignSelf: "center",
    backgroundColor: "#E5E7EB",
    borderRadius: 16,
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  daySeparatorText: {
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
