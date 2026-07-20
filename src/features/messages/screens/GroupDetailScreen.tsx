import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Vibration,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, type CameraType, useCameraPermissions } from "expo-camera";
import { requireOptionalNativeModule } from "expo-modules-core";
import * as Haptics from "expo-haptics";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { MessagesRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import { useTabMessageKeyboardLayout } from "../../../hooks/useTabMessageKeyboardLayout";
import { uploadImage } from "../../../services/media/cloudinary";
import { getEventGroup, type EventGroupInfo } from "../../events/services/eventGroup.service";
import type { MessagesStackParamList } from "../../../navigation/types";
import { MessageBubble } from "../components/MessageBubble";
import { MessageComposer } from "../components/MessageComposer";
import { MessageActionSheet } from "../components/MessageActionSheet";
import { PinnedMessageBar } from "../components/PinnedMessageBar";
import {
  appendCachedThreadMessage,
  getCachedThread,
  getCachedThreadByEventId,
  patchCachedThreadMessageUpdated,
  patchCachedThreadReaction,
  patchCachedThreadReceipts,
  setCachedThread,
} from "../cache/messagesSessionCache";
import { useMessagesRealtime } from "../hooks/useMessagesRealtime";
import {
  resolveThreadLoadMode,
  shouldClearThreadOnLoadError,
  shouldSetThreadLoadingState,
  shouldShowThreadFullScreenLoader,
  type ThreadLoadMode,
} from "../utils/threadLoadPresentation";
import { appendMessageDeduped } from "../utils/threadRealtime";
import {
  applyMessageReactionUpdate,
  applyMessageReceiptUpdates,
  applyMessageUpdated,
} from "../utils/messageReceipts";
import {
  deleteMessage,
  getMessages,
  markConversationRead,
  pinMessage,
  removeMessageReaction,
  sendMessage,
  setMessageReaction,
  unpinMessage,
} from "../services/messages.service";
import {
  GROUP_CLOSED_COMPOSER_MESSAGE_TR,
  GROUP_MUTED_COMPOSER_MESSAGE_TR,
  resolveGroupComposerGate,
} from "../utils/groupModeration";
import type { AllowedMessageReaction, ConversationMessage } from "../types";

type Props = NativeStackScreenProps<MessagesStackParamList, "GroupDetailScreen">;

const ExpoClipboard = requireOptionalNativeModule<{
  setStringAsync: (text: string) => Promise<boolean>;
}>("ExpoClipboard");

const triggerMessageHaptic = async () => {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    Vibration.vibrate(10);
  }
};

const triggerCopySuccessHaptic = async () => {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    Vibration.vibrate(10);
  }
};

const copyMessageText = async (text: string) => {
  if (!ExpoClipboard?.setStringAsync) {
    return false;
  }

  await ExpoClipboard.setStringAsync(text);
  return true;
};

type GroupPhotoCameraModalProps = {
  visible: boolean;
  onClose: () => void;
  onCaptured: (uri: string) => void;
};

function GroupPhotoCameraModal({ visible, onClose, onCaptured }: GroupPhotoCameraModalProps) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!visible || !permission || permission.granted || !permission.canAskAgain) {
      return;
    }
    void requestPermission();
  }, [permission, requestPermission, visible]);

  const capturePhoto = async () => {
    if (isCapturing || !cameraRef.current) {
      return;
    }

    try {
      setIsCapturing(true);
      const result = await cameraRef.current.takePictureAsync({
        quality: 0.82,
        skipProcessing: false,
      });
      if (result?.uri) {
        onCaptured(result.uri);
        onClose();
      }
    } catch {
      Alert.alert("Kamera hatası", "Fotoğraf çekilemedi.");
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <View style={cameraStyles.container}>
        {permission?.granted ? (
          <CameraView facing={facing} mode="picture" ref={cameraRef} style={cameraStyles.camera} />
        ) : (
          <View style={cameraStyles.permissionWrap}>
            <AppText style={cameraStyles.permissionText} variant="body">
              Fotoğraf göndermek için kamera izni gerekli.
            </AppText>
            <Pressable onPress={() => void requestPermission()} style={cameraStyles.permissionButton}>
              <AppText style={cameraStyles.permissionButtonText} variant="label">
                İzin ver
              </AppText>
            </Pressable>
          </View>
        )}

        <View style={[cameraStyles.topBar, { paddingTop: Math.max(insets.top, theme.spacing.md) }]}>
          <Pressable onPress={onClose} style={cameraStyles.iconButton}>
            <Ionicons color="#FFFFFF" name="close" size={28} />
          </Pressable>
          <AppText style={cameraStyles.title} variant="label">
            Fotoğraf çek
          </AppText>
          <Pressable
            disabled={!permission?.granted}
            onPress={() => setFacing((current) => (current === "back" ? "front" : "back"))}
            style={cameraStyles.iconButton}
          >
            <Ionicons color="#FFFFFF" name="camera-reverse-outline" size={26} />
          </Pressable>
        </View>

        <View style={[cameraStyles.bottomBar, { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
          <Pressable
            disabled={!permission?.granted || isCapturing}
            onPress={() => void capturePhoto()}
            style={cameraStyles.shutterOuter}
          >
            {isCapturing ? (
              <ActivityIndicator color="#111827" size="small" />
            ) : (
              <View style={cameraStyles.shutterInner} />
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type FullscreenImageViewerProps = {
  imageUrl: string | null;
  onClose: () => void;
};

function FullscreenImageViewer({ imageUrl, onClose }: FullscreenImageViewerProps) {
  if (!imageUrl) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <Pressable onPress={onClose} style={viewerStyles.overlay}>
        <Pressable onPress={onClose} style={viewerStyles.closeButton}>
          <Ionicons color="#FFFFFF" name="close" size={28} />
        </Pressable>
        <Image resizeMode="contain" source={{ uri: imageUrl }} style={viewerStyles.image} />
      </Pressable>
    </Modal>
  );
}

export function GroupDetailScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { isKeyboardVisible, keyboardPadding, restingBottomInset } = useTabMessageKeyboardLayout();
  const listRef = useRef<FlatList<ConversationMessage>>(null);
  const initialCache =
    (route.params.conversationId ? getCachedThread(route.params.conversationId) : null) ??
    getCachedThreadByEventId(route.params.eventId);
  const [group, setGroup] = useState<EventGroupInfo | null>(initialCache?.group ?? null);
  const [messages, setMessages] = useState<ConversationMessage[]>(initialCache?.messages ?? []);
  const [pinnedMessage, setPinnedMessage] = useState<ConversationMessage | null>(
    initialCache?.pinnedMessage ?? null,
  );
  const [isLoading, setIsLoading] = useState(!initialCache);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<ConversationMessage | null>(null);
  const [replyTarget, setReplyTarget] = useState<ConversationMessage | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [pendingPhotoCaption, setPendingPhotoCaption] = useState("");
  const [composerResetToken, setComposerResetToken] = useState(0);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  const conversationIdRef = useRef(group?.conversationId || route.params.conversationId || "");

  const viewerId = user?.id ?? "";
  const isOrganizer = group?.viewerRole === "ORGANIZER";
  const hasCachedThread =
    Boolean(group) ||
    messages.length > 0 ||
    Boolean(
      (route.params.conversationId ? getCachedThread(route.params.conversationId) : null) ??
        getCachedThreadByEventId(route.params.eventId),
    );

  useEffect(() => {
    conversationIdRef.current = group?.conversationId || route.params.conversationId || "";
  }, [group?.conversationId, route.params.conversationId]);

  const messageIndexById = useMemo(
    () => Object.fromEntries(messages.map((message, index) => [message.id, index])),
    [messages],
  );

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

  const scrollToMessage = useCallback(
    (messageId: string) => {
      const index = messageIndexById[messageId];
      if (index === undefined) {
        return;
      }
      listRef.current?.scrollToIndex({ animated: true, index, viewPosition: 0.5 });
    },
    [messageIndexById],
  );

  const applyMessagesPage = useCallback((page: Awaited<ReturnType<typeof getMessages>>) => {
    setMessages(page.messages);
    setPinnedMessage(page.pinnedMessage);
  }, []);

  const closeActionMenu = useCallback(() => {
    setActionMessage(null);
  }, []);

  const loadChat = async (mode?: ThreadLoadMode) => {
    const cached =
      (route.params.conversationId ? getCachedThread(route.params.conversationId) : null) ??
      getCachedThreadByEventId(route.params.eventId);
    const hasCache = Boolean(cached);
    const resolvedMode = mode ?? resolveThreadLoadMode(hasCache);

    if (shouldSetThreadLoadingState(resolvedMode, hasCache)) {
      setIsLoading(true);
    }

    try {
      const groupResult = await getEventGroup(route.params.eventId);
      if (!groupResult) {
        if (shouldClearThreadOnLoadError(hasCache)) {
          setGroup(null);
          setMessages([]);
          setPinnedMessage(null);
          setError("Grup bulunamadı.");
        }
        return;
      }

      if (!groupResult.isMember) {
        setGroup(groupResult);
        setMessages([]);
        setPinnedMessage(null);
        setError("Bu gruba erişim iznin yok.");
        return;
      }

      const conversationId = groupResult.conversationId || route.params.conversationId;
      if (!conversationId) {
        setGroup(groupResult);
        setMessages([]);
        setPinnedMessage(null);
        setError("Grup sohbeti bulunamadı.");
        return;
      }

      const threadMessages = await getMessages(conversationId);
      setGroup(groupResult);
      applyMessagesPage(threadMessages);
      setCachedThread(conversationId, {
        messages: threadMessages.messages,
        pinnedMessage: threadMessages.pinnedMessage,
        group: groupResult,
        eventId: route.params.eventId,
      });
      setError(null);
      await markConversationRead(conversationId);
    } catch {
      if (shouldClearThreadOnLoadError(hasCache)) {
        setGroup(null);
        setMessages([]);
        setPinnedMessage(null);
        setError("Grup sohbeti yüklenemedi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const cached =
        (route.params.conversationId ? getCachedThread(route.params.conversationId) : null) ??
        getCachedThreadByEventId(route.params.eventId);
      if (cached) {
        setGroup(cached.group);
        setMessages(cached.messages);
        setPinnedMessage(cached.pinnedMessage);
        setError(null);
      }
      void loadChat(resolveThreadLoadMode(Boolean(cached)));
    }, [route.params.conversationId, route.params.eventId]),
  );

  useMessagesRealtime({
    onMessageNew: (event) => {
      if (event.payload.conversationId !== conversationIdRef.current) {
        return;
      }
      setMessages((current) => appendMessageDeduped(current, event.payload.message));
      appendCachedThreadMessage(event.payload.conversationId, event.payload.message);
      scrollToBottom(false);
    },
    onMessageReceipts: (event) => {
      if (event.payload.conversationId !== conversationIdRef.current) {
        return;
      }
      setMessages((current) => applyMessageReceiptUpdates(current, event.payload.updates));
      patchCachedThreadReceipts(event.payload.conversationId, event.payload.updates);
    },
    onMessageReaction: (event) => {
      if (event.payload.conversationId !== conversationIdRef.current) {
        return;
      }
      setMessages((current) =>
        applyMessageReactionUpdate(current, event.payload.messageId, event.payload.reactions),
      );
      patchCachedThreadReaction(
        event.payload.conversationId,
        event.payload.messageId,
        event.payload.reactions,
      );
    },
    onMessageUpdated: (event) => {
      if (event.payload.conversationId !== conversationIdRef.current) {
        return;
      }
      setMessages((current) => applyMessageUpdated(current, event.payload.message));
      patchCachedThreadMessageUpdated(event.payload.conversationId, event.payload.message);
    },
    onReconnect: () => {
      void loadChat("silent");
    },
  });

  const refreshMessages = useCallback(
    async (conversationId: string) => {
      const threadMessages = await getMessages(conversationId);
      applyMessagesPage(threadMessages);
      setCachedThread(conversationId, {
        messages: threadMessages.messages,
        pinnedMessage: threadMessages.pinnedMessage,
        group,
        eventId: route.params.eventId,
      });
    },
    [applyMessagesPage, group, route.params.eventId],
  );

  const onSend = async (text: string, options?: { isAnnouncement?: boolean }) => {
    if (!user || !group?.conversationId || group.isArchived || group.isClosed) {
      return;
    }
    if (resolveGroupComposerGate({ viewerMutedUntil: group.viewerMutedUntil }).kind === "muted") {
      return;
    }

    const sentMessage = await sendMessage({
      threadId: group.conversationId,
      sender: {
        id: user.id,
        displayName: user.publicProfile.displayName || user.publicProfile.username || "Tourist Member",
      },
      text,
      isAnnouncement: options?.isAnnouncement,
      replyToMessageId: replyTarget?.id,
    });

    setReplyTarget(null);
    if (!sentMessage) {
      return;
    }

    setMessages((current) => appendMessageDeduped(current, sentMessage));
    appendCachedThreadMessage(group.conversationId, sentMessage);
    await refreshMessages(group.conversationId);
    scrollToBottom();
  };

  const onPinMessage = async (message: ConversationMessage) => {
    if (!group?.conversationId || !isOrganizer) {
      return;
    }

    await pinMessage(group.conversationId, message.id);
    await refreshMessages(group.conversationId);
  };

  const onUnpinMessage = async () => {
    if (!group?.conversationId || !isOrganizer) {
      return;
    }

    await unpinMessage(group.conversationId);
    await refreshMessages(group.conversationId);
  };

  const onMessageLongPress = useCallback((message: ConversationMessage) => {
    void triggerMessageHaptic();
    setActionMessage(message);
  }, []);

  const chooseReply = (message: ConversationMessage) => {
    setActionMessage(null);
    if (message.isDeleted || group?.isArchived) {
      return;
    }
    setReplyTarget(message);
  };

  const chooseReaction = async (
    message: ConversationMessage,
    emoji: AllowedMessageReaction,
  ) => {
    setActionMessage(null);
    if (!group?.conversationId || message.isDeleted) {
      return;
    }
    try {
      const alreadySelected = message.reactions?.some(
        (reaction) => reaction.emoji === emoji && reaction.reactedByMe,
      );
      const reactions = alreadySelected
        ? await removeMessageReaction(group.conversationId, message.id)
        : await setMessageReaction(group.conversationId, message.id, emoji);
      setMessages((current) => applyMessageReactionUpdate(current, message.id, reactions));
      patchCachedThreadReaction(group.conversationId, message.id, reactions);
    } catch (reactionError) {
      Alert.alert(
        "Tepki eklenemedi",
        reactionError instanceof Error ? reactionError.message : "Lütfen tekrar deneyin.",
      );
    }
  };

  const onCopyMessage = useCallback(async (message: ConversationMessage) => {
    setActionMessage(null);
    const copyValue = message.text?.trim() || "";
    if (!copyValue || message.isDeleted) {
      return;
    }

    const copied = await copyMessageText(copyValue);
    if (copied) {
      await triggerCopySuccessHaptic();
      return;
    }

    Alert.alert(
      "Kopyalanamadı",
      "Panoya kopyalamak için Expo Go'yu güncelleyin veya uygulamayı yeniden derleyin (npx expo run:ios).",
    );
  }, []);

  const confirmDeleteMessage = (message: ConversationMessage) => {
    setActionMessage(null);
    if (!group?.conversationId || message.sender.id !== viewerId || message.isDeleted) {
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
              const updated = await deleteMessage(group.conversationId, message.id);
              if (updated) {
                setMessages((current) => applyMessageUpdated(current, updated));
                patchCachedThreadMessageUpdated(group.conversationId, updated);
              }
            } catch (deleteError) {
              Alert.alert(
                "Silinemedi",
                deleteError instanceof Error ? deleteError.message : "Lütfen tekrar deneyin.",
              );
            }
          })();
        },
      },
    ]);
  };

  const onPinToggleFromSheet = () => {
    if (!actionMessage) {
      return;
    }
    const target = actionMessage;
    setActionMessage(null);
    if (pinnedMessage?.id === target.id) {
      void onUnpinMessage();
      return;
    }
    void onPinMessage(target);
  };

  const onOpenCamera = useCallback((caption: string) => {
    if (
      group?.isArchived ||
      group?.isClosed ||
      resolveGroupComposerGate({ viewerMutedUntil: group?.viewerMutedUntil }).kind === "muted"
    ) {
      return;
    }
    setPendingPhotoCaption(caption);
    setIsCameraOpen(true);
  }, [group?.isArchived, group?.isClosed, group?.viewerMutedUntil]);

  const onPhotoCaptured = useCallback(
    async (localUri: string) => {
      if (
        !user ||
        !group?.conversationId ||
        group.isArchived ||
        group.isClosed ||
        resolveGroupComposerGate({ viewerMutedUntil: group.viewerMutedUntil }).kind === "muted"
      ) {
        return;
      }

      setIsPhotoUploading(true);
      try {
        const mediaUrl = await uploadImage(localUri, { folder: "group-messages" });
        await sendMessage({
          threadId: group.conversationId,
          sender: {
            id: user.id,
            displayName: user.publicProfile.displayName || user.publicProfile.username || "Tourist Member",
          },
          text: pendingPhotoCaption,
          mediaUrl,
          mediaType: "image",
        });
        await refreshMessages(group.conversationId);
        setComposerResetToken((current) => current + 1);
        setPendingPhotoCaption("");
        scrollToBottom();
      } catch (captureError) {
        const message =
          captureError instanceof Error ? captureError.message : "Fotoğraf gönderilemedi.";
        Alert.alert("Fotoğraf gönderilemedi", message);
      } finally {
        setIsPhotoUploading(false);
      }
    },
    [group, pendingPhotoCaption, refreshMessages, scrollToBottom, user],
  );

  const openGroupInfo = () => {
    navigation.navigate(MessagesRoutes.GroupInfoScreen, { eventId: route.params.eventId });
  };

  const selectedMessageId = actionMessage?.id ?? null;
  const canShowPin = Boolean(isOrganizer && !group?.isArchived && !group?.isClosed && actionMessage && !actionMessage.isDeleted);
  const isActionMessagePinned = Boolean(actionMessage && pinnedMessage?.id === actionMessage.id);
  const composerGate = resolveGroupComposerGate({
    isArchived: group?.isArchived,
    isClosed: group?.isClosed,
    viewerMutedUntil: group?.viewerMutedUntil,
  });

  if (shouldShowThreadFullScreenLoader(isLoading, hasCachedThread)) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <Loader label="Grup sohbeti yükleniyor..." />
        </View>
      </SafeAreaView>
    );
  }

  // Access/membership errors clear messages; network errors keep the warm cache visible.
  if ((error && messages.length === 0) || (!group && !hasCachedThread)) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
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

  if (!group) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <Loader label="Grup sohbeti yükleniyor..." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
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
              {group.isClosed ? "Kapatıldı · " : group.isArchived ? "Arşivlendi · " : ""}
              {group.memberCount} üye
            </AppText>
          </Pressable>

          <Pressable onPress={openGroupInfo} style={styles.infoButton}>
            <Ionicons color={theme.colors.textPrimary} name="information-circle-outline" size={26} />
          </Pressable>
        </View>

        {pinnedMessage ? (
          <PinnedMessageBar
            canUnpin={Boolean(isOrganizer)}
            message={pinnedMessage}
            onPress={() => scrollToMessage(pinnedMessage.id)}
            onUnpin={() => void onUnpinMessage()}
          />
        ) : null}

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
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => scrollToBottom(false)}
              onLayout={() => scrollToBottom(false)}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => {
                  listRef.current?.scrollToIndex({ animated: true, index: info.index, viewPosition: 0.5 });
                }, 100);
              }}
              renderItem={({ item }) => {
                return (
                  <MessageBubble
                    isHiddenForActionSheet={selectedMessageId === item.id}
                    isMine={item.sender.id === viewerId}
                    message={item}
                    onImagePress={setFullscreenImageUrl}
                    onLongPress={() => onMessageLongPress(item)}
                    variant="group"
                  />
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        <Animated.View style={{ paddingBottom: keyboardPadding }}>
          <View
            style={[styles.composerWrap, !isKeyboardVisible ? { paddingBottom: restingBottomInset } : null]}
          >
          {composerGate.kind === "closed" ? (
            <View style={styles.archivedBanner}>
              <Ionicons color="#7C2D12" name="lock-closed-outline" size={18} />
              <AppText style={styles.closedText} variant="caption">
                {GROUP_CLOSED_COMPOSER_MESSAGE_TR}
              </AppText>
            </View>
          ) : composerGate.kind === "muted" ? (
            <View style={styles.mutedBanner}>
              <Ionicons color="#6D28D9" name="volume-mute-outline" size={18} />
              <View style={styles.mutedTextWrap}>
                <AppText style={styles.mutedText} variant="caption">
                  {GROUP_MUTED_COMPOSER_MESSAGE_TR}
                </AppText>
                {composerGate.remainingLabel ? (
                  <AppText style={styles.mutedRemaining} variant="caption">
                    {composerGate.remainingLabel}
                  </AppText>
                ) : null}
              </View>
            </View>
          ) : composerGate.kind === "archived" ? (
            <View style={styles.archivedBanner}>
              <Ionicons color={theme.colors.textSecondary} name="archive-outline" size={18} />
              <AppText style={styles.archivedText} variant="caption">
                Bu grup arşivlendi
              </AppText>
            </View>
          ) : (
            <MessageComposer
              disabled={!user}
              isPhotoUploading={isPhotoUploading}
              onCameraPress={onOpenCamera}
              onCancelReply={() => setReplyTarget(null)}
              onSend={onSend}
              replyTarget={replyTarget}
              resetToken={composerResetToken}
              showAnnouncementOption={isOrganizer}
              showLiveCameraButton
              textOnly
            />
          )}
          </View>
        </Animated.View>
      </View>

      <MessageActionSheet
        isMine={actionMessage?.sender.id === viewerId}
        message={actionMessage}
        onClose={closeActionMenu}
        onCopy={(message) => {
          void onCopyMessage(message);
        }}
        onDelete={confirmDeleteMessage}
        onPinToggle={canShowPin ? onPinToggleFromSheet : null}
        onReaction={(message, emoji) => {
          void chooseReaction(message, emoji);
        }}
        onReply={chooseReply}
        pinLabel={
          canShowPin ? (isActionMessagePinned ? "Sabitlemeyi Kaldır" : "Sabitle") : null
        }
      />

      <GroupPhotoCameraModal
        onCaptured={(uri) => void onPhotoCaptured(uri)}
        onClose={() => setIsCameraOpen(false)}
        visible={isCameraOpen}
      />

      <FullscreenImageViewer imageUrl={fullscreenImageUrl} onClose={() => setFullscreenImageUrl(null)} />
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
  closedText: {
    color: "#7C2D12",
    fontWeight: "700",
  },
  mutedBanner: {
    alignItems: "center",
    backgroundColor: "#EDE9FE",
    borderRadius: theme.radius.lg,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  mutedTextWrap: {
    flexShrink: 1,
    gap: 2,
  },
  mutedText: {
    color: "#5B21B6",
    fontWeight: "700",
  },
  mutedRemaining: {
    color: "#6D28D9",
    fontWeight: "600",
  },
  stateCard: {
    flex: 1,
    justifyContent: "center",
    marginHorizontal: theme.spacing.lg,
  },
});

const cameraStyles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  permissionWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  permissionText: {
    color: "#FFFFFF",
    marginBottom: theme.spacing.lg,
    textAlign: "center",
  },
  permissionButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  permissionButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: theme.spacing.md,
    position: "absolute",
    right: 0,
    top: 0,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  iconButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  bottomBar: {
    alignItems: "center",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
  },
  shutterOuter: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 40,
    borderWidth: 4,
    height: 80,
    justifyContent: "center",
    width: 80,
  },
  shutterInner: {
    backgroundColor: "#FFFFFF",
    borderColor: "#111827",
    borderRadius: 30,
    borderWidth: 2,
    height: 60,
    width: 60,
  },
});

const viewerStyles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    flex: 1,
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    right: theme.spacing.lg,
    top: theme.spacing.xxl,
    zIndex: 2,
  },
  image: {
    height: "80%",
    width: "100%",
  },
});
