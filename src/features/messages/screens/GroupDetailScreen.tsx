import React, { useCallback, useRef, useState } from "react";
import { FlatList, Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CommonActions, useFocusEffect } from "@react-navigation/native";

import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { MessagesRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import { getEventGroup, type EventGroupInfo } from "../../events/services/eventGroup.service";
import type { MessagesStackParamList } from "../../../navigation/types";
import { MessageBubble } from "../components/MessageBubble";
import { MessageComposer } from "../components/MessageComposer";
import { getMessages, markConversationRead, sendMessage } from "../services/messages.service";
import type { ConversationMessage } from "../types";

type Props = NativeStackScreenProps<MessagesStackParamList, "GroupDetailScreen">;

export function GroupDetailScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const listRef = useRef<FlatList<ConversationMessage>>(null);
  const [group, setGroup] = useState<EventGroupInfo | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const viewerId = user?.id ?? "";

  const goToInbox = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: MessagesRoutes.MessagesInboxScreen }],
      }),
    );
  }, [navigation]);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const loadChat = async () => {
    setIsLoading(true);
    try {
      const groupResult = await getEventGroup(route.params.eventId);
      if (!groupResult) {
        setGroup(null);
        setMessages([]);
        setError("Grup bulunamadı.");
        return;
      }

      if (!groupResult.isMember) {
        setGroup(groupResult);
        setMessages([]);
        setError("Bu gruba erişim iznin yok.");
        return;
      }

      const conversationId = groupResult.conversationId || route.params.conversationId;
      if (!conversationId) {
        setGroup(groupResult);
        setMessages([]);
        setError("Grup sohbeti bulunamadı.");
        return;
      }

      const threadMessages = await getMessages(conversationId);
      setGroup(groupResult);
      setMessages(threadMessages);
      setError(null);
      await markConversationRead(conversationId);
    } catch {
      setGroup(null);
      setMessages([]);
      setError("Grup sohbeti yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadChat();
    }, [route.params.eventId]),
  );

  const onSend = async (text: string) => {
    if (!user || !group?.conversationId || group.isArchived) {
      return;
    }

    await sendMessage({
      threadId: group.conversationId,
      sender: {
        id: user.id,
        displayName: user.publicProfile.displayName || user.publicProfile.username || "Tourist Member",
      },
      text,
    });

    const nextMessages = await getMessages(group.conversationId);
    setMessages(nextMessages);
    scrollToBottom();
  };

  const openGroupInfo = () => {
    navigation.navigate(MessagesRoutes.GroupInfoScreen, { eventId: route.params.eventId });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <Loader label="Grup sohbeti yükleniyor..." />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !group) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={goToInbox} style={styles.backButton}>
            <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={30} />
          </Pressable>
        </View>
        <Card style={styles.stateCard}>
          <ErrorState onRetry={() => void loadChat()} subtitle={error ?? undefined} title="Grup bulunamadı" />
        </Card>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={goToInbox} style={styles.backButton}>
            <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={30} />
          </Pressable>

          <Pressable onPress={openGroupInfo} style={styles.headerTitleWrap}>
            <AppText numberOfLines={1} style={styles.headerTitle} variant="label">
              {group.title}
            </AppText>
            <AppText style={styles.headerSubtitle} variant="caption">
              {group.memberCount} üye
            </AppText>
          </Pressable>

          <Pressable onPress={openGroupInfo} style={styles.infoButton}>
            <Ionicons color={theme.colors.textPrimary} name="information-circle-outline" size={26} />
          </Pressable>
        </View>

        <View style={styles.messagesArea}>
          {messages.length === 0 ? (
            <View style={styles.emptyWrap}>
              <AppText style={styles.emptyText} variant="body">
                Henüz mesaj yok. İlk mesajı sen gönder!
              </AppText>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              contentContainerStyle={styles.messagesList}
              data={messages}
              keyExtractor={(item) => item.id}
              onContentSizeChange={() => scrollToBottom(false)}
              onLayout={() => scrollToBottom(false)}
              renderItem={({ item }) => (
                <MessageBubble isMine={item.sender.id === viewerId} message={item} variant="group" />
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <View style={styles.composerWrap}>
          {group.isArchived ? (
            <View style={styles.archivedBanner}>
              <Ionicons color={theme.colors.textSecondary} name="archive-outline" size={18} />
              <AppText style={styles.archivedText} variant="caption">
                Bu grup arşivlendi
              </AppText>
            </View>
          ) : (
            <MessageComposer disabled={!user} onSend={onSend} textOnly />
          )}
        </View>
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
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 64,
    paddingHorizontal: theme.spacing.md,
  },
  backButton: {
    marginRight: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  infoButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  messagesArea: {
    flex: 1,
  },
  messagesList: {
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  emptyWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  composerWrap: {
    backgroundColor: "#FFFFFF",
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  archivedBanner: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: theme.radius.lg,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  archivedText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  stateCard: {
    flex: 1,
    justifyContent: "center",
    marginHorizontal: theme.spacing.lg,
  },
});
