import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useModalCommentKeyboardLayout } from "../../../hooks/useModalCommentKeyboardLayout";
import { ComplaintReasonSheet } from "./ComplaintReasonSheet";
import { createContentComplaint, type ComplaintReason } from "../services/complaints.service";
import {
  addReelComment,
  getReelComments,
  likeReel,
  unlikeReel,
} from "../services/reelEngagement.service";
import { useContentShareSheet } from "../../share/hooks/useContentShareSheet";
import { buildReelSharePayload } from "../../share/utils/buildSharePayloads";
import { deleteOrganizerReel } from "../services/reels.service";
import {
  pressReelEventNavigationTarget,
  shouldShowReelEventTag,
} from "../../events/utils/reelEventNavigation";
import type { ReelCommentItem } from "../types/reelEngagement";
import type { ReelItem } from "../types/reels";

type ProfileReelsFeedViewerProps = {
  visible: boolean;
  reels: ReelItem[];
  initialIndex: number;
  onClose: () => void;
  organizerDisplayName: string;
  isOwnProfile?: boolean;
  onEventDetailPress?: (eventId: string) => void;
  onEventAlbumPress?: (eventId: string) => void;
  onReelDeleted?: (reelId: string) => void;
};

type ReelEngagement = {
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

type ReelFeedPageProps = {
  reel: ReelItem;
  pageHeight: number;
  pageWidth: number;
  isPageActive: boolean;
  organizerDisplayName: string;
  isOwnProfile: boolean;
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  isLikeLoading: boolean;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onEventDetailPress?: (eventId: string) => void;
  onEventAlbumPress?: (eventId: string) => void;
  onDelete: () => void;
  onShare: () => void;
  onReport?: () => void;
  showReport?: boolean;
};

function ReelFeedPage({
  reel,
  pageHeight,
  pageWidth,
  isPageActive,
  organizerDisplayName,
  isOwnProfile,
  isLiked,
  likeCount,
  commentCount,
  isLikeLoading,
  onToggleLike,
  onOpenComments,
  onEventDetailPress,
  onEventAlbumPress,
  onDelete,
  onShare,
  onReport,
  showReport = false,
}: ReelFeedPageProps) {
  const insets = useSafeAreaInsets();
  const sortedMedia = useMemo(
    () => reel.media.slice().sort((a, b) => a.order - b.order),
    [reel.media],
  );

  const actionRailBottom = Math.max(insets.bottom, theme.spacing.lg) + 96;
  const captionBottom = Math.max(insets.bottom, theme.spacing.lg) + 24;

  return (
    <View style={[styles.page, { height: pageHeight, width: pageWidth }]}>
      <MediaCarousel
        autoPlayVideo
        height={pageHeight}
        isFocused={isPageActive}
        media={sortedMedia.map((item) => ({
          id: item.id,
          url: item.url,
          type: item.type,
        }))}
      />

      <View style={[styles.captionBlock, { bottom: captionBottom }]}>
        <AppText style={styles.username} variant="label">
          {organizerDisplayName}
        </AppText>
        {reel.caption?.trim() ? (
          <AppText numberOfLines={3} style={styles.caption} variant="body">
            {reel.caption}
          </AppText>
        ) : null}
        {shouldShowReelEventTag(true, reel.event, false) ? (
          <Pressable
            onPress={() =>
              pressReelEventNavigationTarget(reel.event!, {
                onDetail: onEventDetailPress,
                onAlbum: onEventAlbumPress,
              })
            }
            style={styles.eventTag}
          >
            <Ionicons color="#FFFFFF" name="calendar-outline" size={14} />
            <AppText numberOfLines={1} style={styles.eventTagText} variant="caption">
              {reel.event!.title}
            </AppText>
          </Pressable>
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

        {isOwnProfile ? (
          <Pressable onPress={onDelete} style={styles.actionButton}>
            <Ionicons color="#FFFFFF" name="trash-outline" size={30} style={styles.actionIconShadow} />
            <AppText style={styles.actionLabel} variant="caption">
              Sil
            </AppText>
          </Pressable>
        ) : null}
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

export function ProfileReelsFeedViewer({
  visible,
  reels,
  initialIndex,
  onClose,
  organizerDisplayName,
  isOwnProfile = false,
  onEventDetailPress,
  onEventAlbumPress,
  onReelDeleted,
}: ProfileReelsFeedViewerProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const { isKeyboardVisible, keyboardPadding, sheetBottomPadding } = useModalCommentKeyboardLayout({
    extraOffset: theme.spacing.sm,
  });
  const { openShare, contentShareSheet } = useContentShareSheet();
  const listRef = useRef<FlatList<ReelItem>>(null);
  const loadedCommentReelIds = useRef(new Set<string>());

  const [activeReelId, setActiveReelId] = useState<string | null>(null);
  const [localReels, setLocalReels] = useState(reels);
  const [engagementByReelId, setEngagementByReelId] = useState<Record<string, ReelEngagement>>({});
  const [likeLoadingReelId, setLikeLoadingReelId] = useState<string | null>(null);
  const [commentsReel, setCommentsReel] = useState<ReelItem | null>(null);
  const [comments, setComments] = useState<ReelCommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [draftComment, setDraftComment] = useState("");
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [reportReel, setReportReel] = useState<ReelItem | null>(null);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);

  const clampedInitialIndex = useMemo(
    () => Math.min(Math.max(initialIndex, 0), Math.max(localReels.length - 1, 0)),
    [initialIndex, localReels.length],
  );

  useEffect(() => {
    setLocalReels(reels);
    setEngagementByReelId(
      reels.reduce<Record<string, ReelEngagement>>((acc, reel) => {
        acc[reel.id] = {
          liked: reel.viewerState?.liked ?? false,
          likeCount: reel.stats?.likeCount ?? 0,
          commentCount: reel.stats?.commentCount ?? 0,
        };
        return acc;
      }, {}),
    );
  }, [reels]);

  useEffect(() => {
    if (!visible) {
      setActiveReelId(null);
      setCommentsReel(null);
      setComments([]);
      setCommentsError(null);
      setDraftComment("");
      loadedCommentReelIds.current.clear();
      return;
    }

    const reel = localReels[clampedInitialIndex];
    if (reel) {
      setActiveReelId(reel.id);
    }
  }, [clampedInitialIndex, localReels, visible]);

  const loadCommentCount = useCallback(async (reelId: string) => {
    try {
      const items = await getReelComments(reelId);
      setEngagementByReelId((prev) => ({
        ...prev,
        [reelId]: {
          liked: prev[reelId]?.liked ?? false,
          likeCount: prev[reelId]?.likeCount ?? 0,
          commentCount: items.length,
        },
      }));
    } catch {
      // Keep existing counts if comment fetch fails.
    }
  }, []);

  useEffect(() => {
    if (!visible || !activeReelId || loadedCommentReelIds.current.has(activeReelId)) {
      return;
    }

    loadedCommentReelIds.current.add(activeReelId);
    void loadCommentCount(activeReelId);
  }, [activeReelId, loadCommentCount, visible]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((item) => item.isViewable);
    if (first?.item && typeof first.item === "object" && "id" in first.item) {
      setActiveReelId((first.item as ReelItem).id);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const toggleLike = (reel: ReelItem) => {
    if (likeLoadingReelId === reel.id) {
      return;
    }

    const current = engagementByReelId[reel.id] ?? {
      liked: reel.viewerState?.liked ?? false,
      likeCount: reel.stats?.likeCount ?? 0,
      commentCount: reel.stats?.commentCount ?? 0,
    };

    void (async () => {
      setLikeLoadingReelId(reel.id);
      try {
        const result = current.liked ? await unlikeReel(reel.id) : await likeReel(reel.id);
        setEngagementByReelId((prev) => ({
          ...prev,
          [reel.id]: {
            ...prev[reel.id],
            liked: result.liked,
            likeCount: result.likeCount,
            commentCount: prev[reel.id]?.commentCount ?? current.commentCount,
          },
        }));
      } catch {
        // Ignore transient like errors.
      } finally {
        setLikeLoadingReelId(null);
      }
    })();
  };

  const openComments = async (reel: ReelItem) => {
    setCommentsReel(reel);
    setCommentsLoading(true);
    setCommentsError(null);
    setDraftComment("");

    try {
      const items = await getReelComments(reel.id);
      setComments(items);
      setEngagementByReelId((prev) => ({
        ...prev,
        [reel.id]: {
          liked: prev[reel.id]?.liked ?? false,
          likeCount: prev[reel.id]?.likeCount ?? 0,
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
    if (!commentsReel || isCommentSubmitting) {
      return;
    }

    const text = draftComment.trim();
    if (!text) {
      return;
    }

    setIsCommentSubmitting(true);
    try {
      const items = await addReelComment(commentsReel.id, text);
      setComments(items);
      setDraftComment("");
      setEngagementByReelId((prev) => ({
        ...prev,
        [commentsReel.id]: {
          liked: prev[commentsReel.id]?.liked ?? false,
          likeCount: prev[commentsReel.id]?.likeCount ?? 0,
          commentCount: items.length,
        },
      }));
    } catch (err) {
      setCommentsError(err instanceof Error ? err.message : "Yorum gönderilemedi.");
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const confirmDelete = (reel: ReelItem) => {
    Alert.alert("Tanıtımı sil", "Bu tanıtım içeriğini silmek istediğine emin misin?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteOrganizerReel(reel.id);
              setLocalReels((current) => {
                const next = current.filter((item) => item.id !== reel.id);
                if (next.length === 0) {
                  onClose();
                }
                return next;
              });
              onReelDeleted?.(reel.id);
            } catch (error) {
              Alert.alert(
                "Silinemedi",
                error instanceof Error ? error.message : "Tanıtım içeriği silinemedi.",
              );
            }
          })();
        },
      },
    ]);
  };

  const submitReelReport = async (reason: ComplaintReason) => {
    if (!reportReel || isReportSubmitting) {
      return;
    }

    setIsReportSubmitting(true);
    try {
      await createContentComplaint({
        targetType: "REEL",
        targetId: reportReel.id,
        reason,
      });
      setReportReel(null);
      Alert.alert("Şikayet alındı", "Şikayetiniz incelenmek üzere kaydedildi.");
    } catch (err) {
      Alert.alert("Hata", err instanceof Error ? err.message : "Şikayet gönderilemedi.");
    } finally {
      setIsReportSubmitting(false);
    }
  };

  const shareReel = (reel: ReelItem) => {
    openShare(buildReelSharePayload(reel, organizerDisplayName));
  };

  if (!visible || localReels.length === 0) {
    return null;
  }

  return (
    <>
      <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
        <View style={styles.viewer}>
          <FlatList
            data={localReels}
            decelerationRate="fast"
            disableIntervalMomentum
            getItemLayout={(_, index) => ({
              index,
              length: windowHeight,
              offset: windowHeight * index,
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
            renderItem={({ item }) => {
              const engagement = engagementByReelId[item.id] ?? {
                liked: item.viewerState?.liked ?? false,
                likeCount: item.stats?.likeCount ?? 0,
                commentCount: item.stats?.commentCount ?? 0,
              };

              return (
                <ReelFeedPage
                  commentCount={engagement.commentCount}
                  isLikeLoading={likeLoadingReelId === item.id}
                  isLiked={engagement.liked}
                  isOwnProfile={isOwnProfile}
                  isPageActive={activeReelId === item.id}
                  likeCount={engagement.likeCount}
                  onDelete={() => confirmDelete(item)}
                  onEventAlbumPress={onEventAlbumPress}
                  onEventDetailPress={onEventDetailPress}
                  onOpenComments={() => void openComments(item)}
                  onReport={() => setReportReel(item)}
                  onShare={() => shareReel(item)}
                  onToggleLike={() => toggleLike(item)}
                  organizerDisplayName={organizerDisplayName}
                  pageHeight={windowHeight}
                  pageWidth={windowWidth}
                  reel={item}
                  showReport={!isOwnProfile}
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
        </View>

        <Modal
          animationType="slide"
          onRequestClose={() => setCommentsReel(null)}
          transparent
          visible={commentsReel != null}
        >
          <View style={styles.commentsBackdrop}>
            <Pressable onPress={() => setCommentsReel(null)} style={styles.commentsDismissArea} />
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
                <View style={[styles.keyboardFill, { height: keyboardPadding }]} />
              </View>
            </View>
          </View>
        </Modal>
      </Modal>

      <ComplaintReasonSheet
        isSubmitting={isReportSubmitting}
        onClose={() => setReportReel(null)}
        onSubmit={submitReelReport}
        visible={reportReel != null}
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
  eventTag: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: theme.radius.md,
    flexDirection: "row",
    gap: 6,
    marginTop: theme.spacing.sm,
    maxWidth: "100%",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  eventTagText: {
    color: "#FFFFFF",
    flexShrink: 1,
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
