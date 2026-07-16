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
import { PinnedMessageBar } from "../components/PinnedMessageBar";
import {
  getCachedThread,
  getCachedThreadByEventId,
  setCachedThread,
} from "../cache/messagesSessionCache";
import {
  resolveThreadLoadMode,
  shouldClearThreadOnLoadError,
  shouldSetThreadLoadingState,
  shouldShowThreadFullScreenLoader,
  type ThreadLoadMode,
} from "../utils/threadLoadPresentation";
import {
  getMessages,
  markConversationRead,
  pinMessage,
  sendMessage,
  unpinMessage,
} from "../services/messages.service";
import type { ConversationMessage } from "../types";

type Props = NativeStackScreenProps<MessagesStackParamList, "GroupDetailScreen">;

type ActionMenuState = {
  message: ConversationMessage;
};

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

type GroupMessageActionSheetProps = {
  visible: boolean;
  message: ConversationMessage | null;
  isOrganizer: boolean;
  isArchived: boolean;
  isPinned: boolean;
  onClose: () => void;
  onPin: () => void;
  onUnpin: () => void;
  onCopy: () => void;
};

function GroupMessageActionSheet({
  visible,
  message,
  isOrganizer,
  isArchived,
  isPinned,
  onClose,
  onPin,
  onUnpin,
  onCopy,
}: GroupMessageActionSheetProps) {
  if (!message) {
    return null;
  }

  const showPinActions = isOrganizer && !isArchived;

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={actionSheetStyles.overlay}>
        <Pressable onPress={onClose} style={actionSheetStyles.backdrop} />

        <View style={actionSheetStyles.sheetWrap}>
          <View style={actionSheetStyles.handle} />

          <View style={actionSheetStyles.previewCard}>
          <AppText numberOfLines={3} style={actionSheetStyles.previewText} variant="body">
            {message.isAnnouncement ? "📢 " : message.mediaUrl && !message.text?.trim() ? "📷 " : ""}
            {message.mediaUrl && !message.text?.trim() ? "Fotoğraf" : message.text}
          </AppText>
          </View>

          <View style={actionSheetStyles.optionsCard}>
            {showPinActions ? (
              <Pressable
                onPress={() => {
                  onClose();
                  if (isPinned) {
                    onUnpin();
                  } else {
                    onPin();
                  }
                }}
                style={({ pressed }) => [actionSheetStyles.optionRow, pressed && actionSheetStyles.optionRowPressed]}
              >
                <View style={[actionSheetStyles.optionIcon, actionSheetStyles.pinIconWrap]}>
                  <AppText style={actionSheetStyles.optionEmoji}>📌</AppText>
                </View>
                <AppText style={actionSheetStyles.optionLabel} variant="label">
                  {isPinned ? "Sabitlemeyi Kaldır" : "Sabitle"}
                </AppText>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => {
                onClose();
                onCopy();
              }}
              style={({ pressed }) => [actionSheetStyles.optionRow, pressed && actionSheetStyles.optionRowPressed]}
            >
              <View style={[actionSheetStyles.optionIcon, actionSheetStyles.copyIconWrap]}>
                <AppText style={actionSheetStyles.optionEmoji}>📋</AppText>
              </View>
              <AppText style={actionSheetStyles.optionLabel} variant="label">
                Kopyala
              </AppText>
            </Pressable>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [actionSheetStyles.cancelButton, pressed && actionSheetStyles.cancelButtonPressed]}
          >
            <AppText style={actionSheetStyles.cancelLabel} variant="label">
              İptal
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

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
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [pendingPhotoCaption, setPendingPhotoCaption] = useState("");
  const [composerResetToken, setComposerResetToken] = useState(0);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);

  const viewerId = user?.id ?? "";
  const isOrganizer = group?.viewerRole === "ORGANIZER";
  const hasCachedThread =
    Boolean(group) ||
    messages.length > 0 ||
    Boolean(
      (route.params.conversationId ? getCachedThread(route.params.conversationId) : null) ??
        getCachedThreadByEventId(route.params.eventId),
    );

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
    setActionMenu(null);
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
      isAnnouncement: options?.isAnnouncement,
    });

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
    setActionMenu({ message });
  }, []);

  const onCopyMessage = useCallback(async (message: ConversationMessage) => {
    const copyValue = message.text?.trim() || message.mediaUrl || "";
    if (!copyValue) {
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

  const onOpenCamera = useCallback((caption: string) => {
    if (group?.isArchived) {
      return;
    }
    setPendingPhotoCaption(caption);
    setIsCameraOpen(true);
  }, [group?.isArchived]);

  const onPhotoCaptured = useCallback(
    async (localUri: string) => {
      if (!user || !group?.conversationId || group.isArchived) {
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

  const selectedMessageId = actionMenu?.message.id ?? null;
  const actionMessage = actionMenu?.message ?? null;
  const isActionMessagePinned = Boolean(actionMessage && pinnedMessage?.id === actionMessage.id);

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
              {group.isArchived ? "Arşivlendi · " : ""}
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
                const isSelected = selectedMessageId === item.id;
                return (
                  <Pressable
                    delayLongPress={280}
                    onLongPress={() => onMessageLongPress(item)}
                    style={[styles.messagePressable, isSelected && styles.messagePressableSelected]}
                  >
                    <MessageBubble
                      isMine={item.sender.id === viewerId}
                      message={item}
                      onImagePress={setFullscreenImageUrl}
                      variant="group"
                    />
                  </Pressable>
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
          {group.isArchived ? (
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
              onSend={onSend}
              resetToken={composerResetToken}
              showAnnouncementOption={isOrganizer}
              showLiveCameraButton
              textOnly
            />
          )}
          </View>
        </Animated.View>
      </View>

      <GroupMessageActionSheet
        isArchived={group.isArchived}
        isOrganizer={Boolean(isOrganizer)}
        isPinned={isActionMessagePinned}
        message={actionMessage}
        onClose={closeActionMenu}
        onCopy={() => {
          if (actionMessage) {
            void onCopyMessage(actionMessage);
          }
        }}
        onPin={() => {
          if (actionMessage) {
            void onPinMessage(actionMessage);
          }
        }}
        onUnpin={() => void onUnpinMessage()}
        visible={Boolean(actionMenu)}
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
  messagePressable: {
    borderRadius: theme.radius.lg,
    marginHorizontal: -theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
  },
  messagePressableSelected: {
    backgroundColor: "rgba(91, 60, 246, 0.08)",
    transform: [{ scale: 0.985 }],
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
  stateCard: {
    flex: 1,
    justifyContent: "center",
    marginHorizontal: theme.spacing.lg,
  },
});

const actionSheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  sheetWrap: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 999,
    height: 4,
    marginBottom: theme.spacing.xs,
    width: 40,
  },
  previewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  previewText: {
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  optionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  optionRow: {
    alignItems: "center",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: theme.spacing.md,
    minHeight: 56,
    paddingHorizontal: theme.spacing.lg,
  },
  optionRowPressed: {
    backgroundColor: "#F8FAFC",
  },
  optionIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  pinIconWrap: {
    backgroundColor: "#EFF6FF",
  },
  copyIconWrap: {
    backgroundColor: "#F3F4F6",
  },
  optionEmoji: {
    fontSize: 18,
  },
  optionLabel: {
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.lg,
    justifyContent: "center",
    minHeight: 56,
    paddingVertical: theme.spacing.md,
  },
  cancelButtonPressed: {
    backgroundColor: "#F8FAFC",
  },
  cancelLabel: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
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
