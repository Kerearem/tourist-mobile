import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MediaCarousel } from "../../../components/media/MediaCarousel";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import { useModalCommentKeyboardLayout } from "../../../hooks/useModalCommentKeyboardLayout";
import { useContentShareSheet } from "../../share/hooks/useContentShareSheet";
import { buildMomentSharePayload } from "../../share/utils/buildSharePayloads";
import { ComplaintReasonSheet } from "../../profile/components/ComplaintReasonSheet";
import { useOwnContentManagement } from "../../profile/hooks/useOwnContentManagement";
import { createContentComplaint, type ComplaintReason } from "../../profile/services/complaints.service";
import {
  addMomentComment,
  getMomentComments,
  likeMoment,
  unlikeMoment,
} from "../services/momentEngagement.service";
import type { EventAlbumMoment } from "../types";
import type { MomentCommentItem } from "../types/momentEngagement";

type EventMomentFeedViewerProps = {
  visible: boolean;
  eventId: string;
  moments: EventAlbumMoment[];
  initialIndex: number;
  onClose: () => void;
  onMomentsChange?: (moments: EventAlbumMoment[]) => void;
};

type MomentEngagement = {
  liked: boolean;
  likeCount: number;
  commentCount: number;
};

const formatCount = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `${value}`;
};

type EventMomentFeedPageProps = {
  moment: EventAlbumMoment;
  pageHeight: number;
  pageWidth: number;
  isActive: boolean;
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  isLikeLoading: boolean;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onShare: () => void;
  onReport?: () => void;
  showReport?: boolean;
};

function EventMomentFeedPage({
  moment,
  pageHeight,
  pageWidth,
  isActive,
  isLiked,
  likeCount,
  commentCount,
  isLikeLoading,
  onToggleLike,
  onOpenComments,
  onShare,
  onReport,
  showReport = false,
}: EventMomentFeedPageProps) {
  const insets = useSafeAreaInsets();
  const actionRailBottom = Math.max(insets.bottom, theme.spacing.lg) + 96;
  const captionBottom = Math.max(insets.bottom, theme.spacing.lg) + 24;

  const carouselMedia = useMemo(
    () =>
      moment.media.map((item) => ({
        id: item.id,
        url: item.url,
        type: item.type,
      })),
    [moment.media],
  );

  return (
    <View style={[styles.page, { height: pageHeight, width: pageWidth }]}>
      <MediaCarousel
        autoPlayVideo={isActive}
        borderRadius={0}
        height={pageHeight}
        isFocused={isActive}
        media={carouselMedia}
      />

      <View style={[styles.captionBlock, { bottom: captionBottom }]}>
        <AppText style={styles.username} variant="label">
          {moment.author.displayName}
        </AppText>
        {moment.caption?.trim() ? (
          <AppText numberOfLines={3} style={styles.caption} variant="body">
            {moment.caption}
          </AppText>
        ) : null}
      </View>

      <View style={[styles.actionRail, { bottom: actionRailBottom }]}>
        <Pressable disabled={isLikeLoading} onPress={onToggleLike} style={styles.actionButton}>
          <Ionicons
            color={isLiked ? "#FF375F" : "#FFFFFF"}
            name="heart"
            size={34}
            style={styles.actionIconShadow}
          />
          <AppText style={styles.actionLabel} variant="caption">
            {formatCount(likeCount)}
          </AppText>
        </Pressable>

        <Pressable onPress={onOpenComments} style={styles.actionButton}>
          <Ionicons color="#FFFFFF" name="chatbubble" size={32} style={styles.actionIconShadow} />
          <AppText style={styles.actionLabel} variant="caption">
            {formatCount(commentCount)}
          </AppText>
        </Pressable>

        <Pressable onPress={onShare} style={styles.actionButton}>
          <Ionicons color="#FFFFFF" name="share-social" size={32} style={styles.actionIconShadow} />
          <AppText style={styles.actionLabel} variant="caption">
            Paylaş
          </AppText>
        </Pressable>

        {showReport && onReport ? (
          <Pressable onPress={onReport} style={styles.actionButton}>
            <Ionicons color="#FFFFFF" name="flag-outline" size={30} style={styles.actionIconShadow} />
            <AppText style={styles.actionLabel} variant="caption">
              Şikayet
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function EventMomentFeedViewer({
  visible,
  eventId,
  moments,
  initialIndex,
  onClose,
  onMomentsChange,
}: EventMomentFeedViewerProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const { isKeyboardVisible, keyboardPadding, sheetBottomPadding } = useModalCommentKeyboardLayout({
    extraOffset: theme.spacing.sm,
  });
  const { openShare, contentShareSheet } = useContentShareSheet();
  const listRef = useRef<FlatList<EventAlbumMoment>>(null);
  const loadedCommentMomentIds = useRef(new Set<string>());

  const [engagementByMomentId, setEngagementByMomentId] = useState<Record<string, MomentEngagement>>({});
  const [likeLoadingMomentId, setLikeLoadingMomentId] = useState<string | null>(null);
  const [activeMomentId, setActiveMomentId] = useState<string | null>(null);

  const [commentsMoment, setCommentsMoment] = useState<EventAlbumMoment | null>(null);
  const [comments, setComments] = useState<MomentCommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [draftComment, setDraftComment] = useState("");
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [reportMoment, setReportMoment] = useState<EventAlbumMoment | null>(null);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [localMoments, setLocalMoments] = useState(moments);

  const { openManagement, managementUi } = useOwnContentManagement({
    context: "event-album",
    items: localMoments,
    setItems: setLocalMoments,
    onAllDeleted: onClose,
  });

  const activeMoment = useMemo(
    () => localMoments.find((moment) => moment.id === activeMomentId) ?? null,
    [activeMomentId, localMoments],
  );

  const isOwnActiveMoment = Boolean(activeMoment && user?.id === activeMoment.author.id);

  const pageHeight = windowHeight;

  const clampedInitialIndex = useMemo(
    () => Math.min(Math.max(initialIndex, 0), Math.max(localMoments.length - 1, 0)),
    [initialIndex, localMoments.length],
  );

  useEffect(() => {
    setLocalMoments(moments);
  }, [moments]);

  useEffect(() => {
    onMomentsChange?.(localMoments);
  }, [localMoments, onMomentsChange]);

  useEffect(() => {
    if (!visible) {
      setCommentsMoment(null);
      setComments([]);
      setCommentsError(null);
      setDraftComment("");
      loadedCommentMomentIds.current.clear();
      return;
    }

    const moment = localMoments[clampedInitialIndex];
    if (moment) {
      setActiveMomentId(moment.id);
    }
  }, [clampedInitialIndex, moments, visible]);

  const loadCommentCount = useCallback(
    async (momentId: string) => {
      try {
        const items = await getMomentComments(eventId, momentId);
        setEngagementByMomentId((prev) => ({
          ...prev,
          [momentId]: {
            liked: prev[momentId]?.liked ?? false,
            likeCount: prev[momentId]?.likeCount ?? 0,
            commentCount: items.length,
          },
        }));
      } catch {
        // Keep existing counts if comment fetch fails.
      }
    },
    [eventId],
  );

  useEffect(() => {
    if (!visible || !activeMomentId || loadedCommentMomentIds.current.has(activeMomentId)) {
      return;
    }

    loadedCommentMomentIds.current.add(activeMomentId);
    void loadCommentCount(activeMomentId);
  }, [activeMomentId, loadCommentCount, visible]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((item) => item.isViewable);
    if (first?.item && typeof first.item === "object" && "id" in first.item) {
      const moment = first.item as EventAlbumMoment;
      setActiveMomentId(moment.id);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const toggleLike = (moment: EventAlbumMoment) => {
    if (likeLoadingMomentId === moment.id) {
      return;
    }

    const current = engagementByMomentId[moment.id] ?? { liked: false, likeCount: 0, commentCount: 0 };

    void (async () => {
      setLikeLoadingMomentId(moment.id);
      try {
        const result = current.liked
          ? await unlikeMoment(eventId, moment.id)
          : await likeMoment(eventId, moment.id);
        setEngagementByMomentId((prev) => ({
          ...prev,
          [moment.id]: {
            ...prev[moment.id],
            liked: result.liked,
            likeCount: result.likeCount,
            commentCount: prev[moment.id]?.commentCount ?? current.commentCount,
          },
        }));
      } catch {
        // Ignore transient like errors.
      } finally {
        setLikeLoadingMomentId(null);
      }
    })();
  };

  const openComments = async (moment: EventAlbumMoment) => {
    setCommentsMoment(moment);
    setCommentsLoading(true);
    setCommentsError(null);
    setDraftComment("");

    try {
      const items = await getMomentComments(eventId, moment.id);
      setComments(items);
      setEngagementByMomentId((prev) => ({
        ...prev,
        [moment.id]: {
          liked: prev[moment.id]?.liked ?? false,
          likeCount: prev[moment.id]?.likeCount ?? 0,
          commentCount: items.length,
        },
      }));
    } catch (err) {
      setComments([]);
      setCommentsError(err instanceof Error ? err.message : "Yorumlar yüklenemedi.");
    } finally {
      setCommentsLoading(false);
    }
  };

  const submitComment = async () => {
    if (!commentsMoment || isCommentSubmitting) {
      return;
    }

    const text = draftComment.trim();
    if (!text) {
      return;
    }

    setIsCommentSubmitting(true);
    try {
      const items = await addMomentComment(eventId, commentsMoment.id, text);
      setComments(items);
      setDraftComment("");
      setEngagementByMomentId((prev) => ({
        ...prev,
        [commentsMoment.id]: {
          liked: prev[commentsMoment.id]?.liked ?? false,
          likeCount: prev[commentsMoment.id]?.likeCount ?? 0,
          commentCount: items.length,
        },
      }));
    } catch (err) {
      setCommentsError(err instanceof Error ? err.message : "Yorum gönderilemedi.");
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const canReportMoment = (moment: EventAlbumMoment) =>
    Boolean(user?.id && moment.author.id !== user.id);

  const submitMomentReport = async (reason: ComplaintReason) => {
    if (!reportMoment || isReportSubmitting) {
      return;
    }

    setIsReportSubmitting(true);
    try {
      await createContentComplaint({
        targetType: "MOMENT",
        targetId: reportMoment.id,
        reason,
      });
      setReportMoment(null);
      Alert.alert("Şikayet alındı", "Şikayetiniz incelenmek üzere kaydedildi.");
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Şikayet gönderilemedi.");
    } finally {
      setIsReportSubmitting(false);
    }
  };

  const shareMoment = (moment: EventAlbumMoment) => {
    openShare(buildMomentSharePayload(moment));
  };

  if (!visible || localMoments.length === 0) {
    return null;
  }

  return (
    <>
      <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <View style={styles.viewer}>
        <FlatList
          data={localMoments}
          decelerationRate="fast"
          disableIntervalMomentum
          getItemLayout={(_, index) => ({
            index,
            length: pageHeight,
            offset: pageHeight * index,
          })}
          initialScrollIndex={clampedInitialIndex}
          keyExtractor={(item) => item.id}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({ animated: false, index: info.index });
            }, 80);
          }}
          onViewableItemsChanged={onViewableItemsChanged}
          pagingEnabled
          ref={listRef}
          renderItem={({ item, index }) => {
            const engagement = engagementByMomentId[item.id] ?? {
              liked: false,
              likeCount: 0,
              commentCount: 0,
            };
            const isActive = item.id === activeMomentId;

            return (
              <EventMomentFeedPage
                commentCount={engagement.commentCount}
                isActive={isActive}
                isLikeLoading={likeLoadingMomentId === item.id}
                isLiked={engagement.liked}
                likeCount={engagement.likeCount}
                moment={item}
                onOpenComments={() => void openComments(item)}
                onReport={() => setReportMoment(item)}
                onShare={() => shareMoment(item)}
                onToggleLike={() => toggleLike(item)}
                pageHeight={pageHeight}
                pageWidth={windowWidth}
                showReport={canReportMoment(item)}
              />
            );
          }}
          showsVerticalScrollIndicator={false}
          viewabilityConfig={viewabilityConfig}
        />

        <Pressable
          accessibilityLabel="Geri"
          onPress={onClose}
          style={[styles.backButton, { top: Math.max(insets.top, theme.spacing.md) }]}
        >
          <Ionicons color="#FFFFFF" name="chevron-back" size={30} />
        </Pressable>
        {isOwnActiveMoment && activeMoment ? (
          <Pressable
            accessibilityLabel="Gönderi seçenekleri"
            hitSlop={12}
            onPress={() =>
              openManagement({
                id: activeMoment.id,
                type: "MOMENT",
                caption: activeMoment.caption,
                isPinned: activeMoment.isPinned,
                eventId,
              })
            }
            style={[styles.manageButton, { top: Math.max(insets.top, theme.spacing.md) }]}
          >
            <Ionicons color="#FFFFFF" name="ellipsis-horizontal" size={28} />
          </Pressable>
        ) : null}
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setCommentsMoment(null)}
        transparent
        visible={commentsMoment != null}
      >
        <View style={styles.commentsBackdrop}>
          <Pressable onPress={() => setCommentsMoment(null)} style={styles.commentsDismissArea} />
          <View
            style={[
              styles.commentsSheet,
              !isKeyboardVisible ? { paddingBottom: sheetBottomPadding } : null,
            ]}
          >
            <View style={styles.commentsSheetBody}>
              <View style={styles.commentsHandle} />
              <AppText style={styles.commentsTitle} variant="sectionTitle">
                Yorumlar
              </AppText>

              {commentsLoading ? (
                <View style={styles.commentsState}>
                  <ActivityIndicator color={theme.colors.primary} />
                </View>
              ) : commentsError ? (
                <View style={styles.commentsState}>
                  <AppText style={styles.commentsError} variant="bodyMuted">
                    {commentsError}
                  </AppText>
                </View>
              ) : comments.length === 0 ? (
                <View style={styles.commentsState}>
                  <AppText variant="bodyMuted">Henüz yorum yok.</AppText>
                </View>
              ) : (
                <FlatList
                  contentContainerStyle={styles.commentsList}
                  data={comments}
                  keyboardShouldPersistTaps="handled"
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.commentRow}>
                      <AppText style={styles.commentAuthor} variant="label">
                        @{item.author.username || item.author.displayName}
                      </AppText>
                      <AppText style={styles.commentText} variant="body">
                        {item.text}
                      </AppText>
                    </View>
                  )}
                  style={styles.commentsScroll}
                />
              )}
            </View>

            <View style={styles.composerDock}>
              <View style={styles.commentComposer}>
                <TextInput
                  onChangeText={setDraftComment}
                  placeholder="Yorum yaz..."
                  placeholderTextColor={theme.colors.muted}
                  style={styles.commentInput}
                  value={draftComment}
                />
                <Pressable
                  disabled={isCommentSubmitting || !draftComment.trim()}
                  onPress={() => void submitComment()}
                  style={styles.commentSend}
                >
                  <Ionicons
                    color={draftComment.trim() ? theme.colors.primary : theme.colors.muted}
                    name="send"
                    size={22}
                  />
                </Pressable>
              </View>
              <Animated.View style={[styles.keyboardFill, { height: keyboardPadding }]} />
            </View>
          </View>
        </View>
      </Modal>

      {managementUi}
      </Modal>

      <ComplaintReasonSheet
        isSubmitting={isReportSubmitting}
        onClose={() => setReportMoment(null)}
        onSubmit={submitMomentReport}
        visible={reportMoment != null}
      />
      {contentShareSheet}
    </>
  );
}

const styles = StyleSheet.create({
  viewer: {
    backgroundColor: "#000000",
    flex: 1,
  },
  backButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    left: theme.spacing.sm,
    position: "absolute",
    width: 44,
    zIndex: 10,
  },
  manageButton: {
    alignItems: "center",
    elevation: 10,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: theme.spacing.sm,
    width: 44,
    zIndex: 10,
  },
  page: {
    backgroundColor: "#000000",
    overflow: "hidden",
    position: "relative",
  },
  captionBlock: {
    left: theme.spacing.lg,
    maxWidth: "68%",
    position: "absolute",
    zIndex: 5,
  },
  username: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: theme.spacing.xs,
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  caption: {
    color: "#FFFFFF",
    lineHeight: 22,
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  actionRail: {
    alignItems: "center",
    gap: theme.spacing.lg,
    position: "absolute",
    right: theme.spacing.md,
    zIndex: 5,
  },
  actionButton: {
    alignItems: "center",
    gap: 4,
  },
  actionIconShadow: {
    textShadowColor: "rgba(0, 0, 0, 0.72)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  actionLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.72)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  commentsBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  commentsDismissArea: {
    flex: 1,
  },
  commentsSheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    maxHeight: "72%",
    minHeight: 320,
    overflow: "hidden",
  },
  commentsSheetBody: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  commentsHandle: {
    alignSelf: "center",
    backgroundColor: theme.colors.border,
    borderRadius: 999,
    height: 4,
    marginBottom: theme.spacing.md,
    width: 40,
  },
  commentsTitle: {
    marginBottom: theme.spacing.sm,
  },
  commentsState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 120,
    paddingVertical: theme.spacing.lg,
  },
  commentsError: {
    textAlign: "center",
  },
  commentsScroll: {
    flex: 1,
  },
  commentsList: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  commentRow: {
    gap: 2,
  },
  commentAuthor: {
    color: theme.colors.textPrimary,
  },
  commentText: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  composerDock: {
    backgroundColor: theme.colors.background,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  keyboardFill: {
    backgroundColor: theme.colors.background,
  },
  commentComposer: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  commentInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    flex: 1,
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  commentSend: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
});
