import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type ViewToken,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "../../../components/ui/AppText";
import { VerifiedNameRow } from "../../../components/ui/VerifiedNameRow";
import { theme } from "../../../constants/theme";
import { useModalCommentKeyboardLayout } from "../../../hooks/useModalCommentKeyboardLayout";
import { ApiRequestError } from "../../../services/api/client";
import {
  addSnapComment,
  getSnapComments,
  likeSnap,
  unlikeSnap,
} from "../services/snaps.service";
import type { SnapItem } from "../types";
import type { SnapCommentItem } from "../../explore/types";

type ProfileSnapFeedViewerProps = {
  visible: boolean;
  snaps: SnapItem[];
  initialIndex: number;
  onClose: () => void;
  authorFallback: {
    displayName: string;
    username: string;
  };
};

type SnapEngagement = {
  liked: boolean;
  likeCount: number;
  commentCount: number;
};

const countSnapComments = (items: SnapCommentItem[]): number =>
  items.reduce((sum, item) => sum + 1 + countSnapComments(item.replies ?? []), 0);

const formatCount = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `${value}`;
};

const resolveAuthor = (snap: SnapItem, fallback: ProfileSnapFeedViewerProps["authorFallback"]) => ({
  displayName: snap.author?.displayName ?? fallback.displayName,
  username: snap.author?.username ?? fallback.username,
});

type ProfileSnapFeedPageProps = {
  snap: SnapItem;
  pageHeight: number;
  authorUsername: string;
  authorDisplayName: string;
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  isLikeLoading: boolean;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onShare: () => void;
};

function ProfileSnapFeedPage({
  snap,
  pageHeight,
  authorUsername,
  authorDisplayName,
  isLiked,
  likeCount,
  commentCount,
  isLikeLoading,
  onToggleLike,
  onOpenComments,
  onShare,
}: ProfileSnapFeedPageProps) {
  const insets = useSafeAreaInsets();
  const [isSwapped, setIsSwapped] = useState(false);

  const actionRailBottom = Math.max(insets.bottom, theme.spacing.lg) + 96;
  const captionBottom = Math.max(insets.bottom, theme.spacing.lg) + 24;

  const mainUri = isSwapped ? snap.frontMediaUrl : snap.backMediaUrl;
  const insetUri = isSwapped ? snap.backMediaUrl : snap.frontMediaUrl;
  const caption = snap.caption?.trim() || snap.locationText?.trim() || "";

  return (
    <View style={[styles.page, { height: pageHeight }]}>
      <Image resizeMode="cover" source={{ uri: mainUri }} style={styles.mainImage} />

      <Pressable onPress={() => setIsSwapped((current) => !current)} style={styles.insetWrap}>
        <Image resizeMode="cover" source={{ uri: insetUri }} style={styles.insetImage} />
      </Pressable>

      <View style={[styles.captionBlock, { bottom: captionBottom }]}>
        <VerifiedNameRow
          accountType={snap.author?.accountType}
          badgeSize={15}
          isOrganizer={snap.author?.isOrganizer}
          name={`@${authorUsername || authorDisplayName}`}
          style={styles.usernameRow}
          textStyle={styles.username}
          verificationBadge={snap.author?.verificationBadge}
        />
        {caption ? (
          <AppText numberOfLines={3} style={styles.caption} variant="body">
            {caption}
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
      </View>
    </View>
  );
}

export function ProfileSnapFeedViewer({
  visible,
  snaps,
  initialIndex,
  onClose,
  authorFallback,
}: ProfileSnapFeedViewerProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { isKeyboardVisible, keyboardPadding, sheetBottomPadding } = useModalCommentKeyboardLayout({
    extraOffset: theme.spacing.sm,
  });
  const listRef = useRef<FlatList<SnapItem>>(null);
  const loadedCommentSnapIds = useRef(new Set<string>());

  const [engagementBySnapId, setEngagementBySnapId] = useState<Record<string, SnapEngagement>>({});
  const [likeLoadingSnapId, setLikeLoadingSnapId] = useState<string | null>(null);
  const [activeSnapId, setActiveSnapId] = useState<string | null>(null);

  const [commentsSnap, setCommentsSnap] = useState<SnapItem | null>(null);
  const [comments, setComments] = useState<SnapCommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [draftComment, setDraftComment] = useState("");
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);

  const pageHeight = windowHeight;

  const clampedInitialIndex = useMemo(
    () => Math.min(Math.max(initialIndex, 0), Math.max(snaps.length - 1, 0)),
    [initialIndex, snaps.length],
  );

  useEffect(() => {
    if (!visible) {
      setCommentsSnap(null);
      setComments([]);
      setCommentsError(null);
      setDraftComment("");
      loadedCommentSnapIds.current.clear();
      return;
    }

    const snap = snaps[clampedInitialIndex];
    if (snap) {
      setActiveSnapId(snap.id);
    }
  }, [clampedInitialIndex, snaps, visible]);

  const loadCommentCount = useCallback(async (snapId: string) => {
    try {
      const items = await getSnapComments(snapId);
      const commentCount = countSnapComments(items);
      setEngagementBySnapId((prev) => ({
        ...prev,
        [snapId]: {
          liked: prev[snapId]?.liked ?? false,
          likeCount: prev[snapId]?.likeCount ?? 0,
          commentCount,
        },
      }));
    } catch {
      // Keep existing counts if comment fetch fails.
    }
  }, []);

  useEffect(() => {
    if (!visible || !activeSnapId || loadedCommentSnapIds.current.has(activeSnapId)) {
      return;
    }

    loadedCommentSnapIds.current.add(activeSnapId);
    void loadCommentCount(activeSnapId);
  }, [activeSnapId, loadCommentCount, visible]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((item) => item.isViewable);
    if (first?.item && typeof first.item === "object" && "id" in first.item) {
      const snap = first.item as SnapItem;
      setActiveSnapId(snap.id);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const toggleLike = (snap: SnapItem) => {
    if (likeLoadingSnapId === snap.id) {
      return;
    }

    const current = engagementBySnapId[snap.id] ?? { liked: false, likeCount: 0, commentCount: 0 };

    void (async () => {
      setLikeLoadingSnapId(snap.id);
      try {
        const result = current.liked ? await unlikeSnap(snap.id) : await likeSnap(snap.id);
        setEngagementBySnapId((prev) => ({
          ...prev,
          [snap.id]: {
            ...prev[snap.id],
            liked: result.liked,
            likeCount: result.likeCount,
            commentCount: prev[snap.id]?.commentCount ?? current.commentCount,
          },
        }));
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 409) {
          setEngagementBySnapId((prev) => ({
            ...prev,
            [snap.id]: {
              ...prev[snap.id],
              liked: true,
              likeCount: prev[snap.id]?.likeCount ?? current.likeCount,
              commentCount: prev[snap.id]?.commentCount ?? current.commentCount,
            },
          }));
          return;
        }
      } finally {
        setLikeLoadingSnapId(null);
      }
    })();
  };

  const openComments = async (snap: SnapItem) => {
    setCommentsSnap(snap);
    setCommentsLoading(true);
    setCommentsError(null);
    setDraftComment("");

    try {
      const items = await getSnapComments(snap.id);
      setComments(items);
      const commentCount = countSnapComments(items);
      setEngagementBySnapId((prev) => ({
        ...prev,
        [snap.id]: {
          liked: prev[snap.id]?.liked ?? false,
          likeCount: prev[snap.id]?.likeCount ?? 0,
          commentCount,
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
    if (!commentsSnap || isCommentSubmitting) {
      return;
    }

    const text = draftComment.trim();
    if (!text) {
      return;
    }

    setIsCommentSubmitting(true);
    try {
      await addSnapComment(commentsSnap.id, text);
      const items = await getSnapComments(commentsSnap.id);
      setComments(items);
      setDraftComment("");
      const commentCount = countSnapComments(items);
      setEngagementBySnapId((prev) => ({
        ...prev,
        [commentsSnap.id]: {
          liked: prev[commentsSnap.id]?.liked ?? false,
          likeCount: prev[commentsSnap.id]?.likeCount ?? 0,
          commentCount,
        },
      }));
    } catch (err) {
      setCommentsError(err instanceof Error ? err.message : "Yorum gönderilemedi.");
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const shareSnap = async (snap: SnapItem) => {
    const author = resolveAuthor(snap, authorFallback);
    const message = snap.caption?.trim() || `${author.displayName} Snap paylaştı`;

    try {
      await Share.share({
        message,
        url: snap.backMediaUrl,
      });
    } catch {
      // User dismissed share sheet.
    }
  };

  if (!visible || snaps.length === 0) {
    return null;
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <View style={styles.viewer}>
        <FlatList
          data={snaps}
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
          renderItem={({ item }) => {
            const author = resolveAuthor(item, authorFallback);
            const engagement = engagementBySnapId[item.id] ?? {
              liked: false,
              likeCount: 0,
              commentCount: 0,
            };

            return (
              <ProfileSnapFeedPage
                authorDisplayName={author.displayName}
                authorUsername={author.username}
                commentCount={engagement.commentCount}
                isLikeLoading={likeLoadingSnapId === item.id}
                isLiked={engagement.liked}
                likeCount={engagement.likeCount}
                onOpenComments={() => void openComments(item)}
                onShare={() => void shareSnap(item)}
                onToggleLike={() => toggleLike(item)}
                pageHeight={pageHeight}
                snap={item}
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
        onRequestClose={() => setCommentsSnap(null)}
        transparent
        visible={commentsSnap != null}
      >
        <View style={styles.commentsBackdrop}>
          <Pressable onPress={() => setCommentsSnap(null)} style={styles.commentsDismissArea} />
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
    </Modal>
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
    width: "100%",
  },
  mainImage: {
    height: "100%",
    width: "100%",
  },
  insetWrap: {
    borderRadius: theme.radius.md,
    height: 148,
    overflow: "hidden",
    position: "absolute",
    right: theme.spacing.lg,
    top: theme.spacing.xxl + 36,
    width: 108,
    zIndex: 4,
  },
  insetImage: {
    height: "100%",
    width: "100%",
  },
  captionBlock: {
    left: theme.spacing.lg,
    maxWidth: "68%",
    position: "absolute",
    zIndex: 5,
  },
  usernameRow: {
    maxWidth: "100%",
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
