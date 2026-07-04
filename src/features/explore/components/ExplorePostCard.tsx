import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MediaCarousel } from "../../../components/media/MediaCarousel";
import { Avatar } from "../../../components/ui/Avatar";
import { VerifiedNameRow } from "../../../components/ui/VerifiedNameRow";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import { BeRealSnapMedia } from "../../snaps/components/BeRealSnapMedia";
import type { FollowStatus } from "../../profile/services/follow.service";
import type { ExplorePost } from "../types";

type ExplorePostCardProps = {
  post: ExplorePost;
  height?: number;
  viewerId?: string;
  authorFollowStatus?: FollowStatus | null;
  onCommentPress?: () => void;
  onLikePress?: () => void;
  onAuthorPress?: () => void;
  onSharePress?: () => void;
  onFollowPress?: () => void;
  onReportPress?: () => void;
  isFollowLoading?: boolean;
  isLiked?: boolean;
  likeCount?: number;
  commentCount?: number;
};

const formatCount = (value: number) => {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }

  return `${value}`;
};

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.actionButton}>
      <Ionicons color="#FFFFFF" name={icon} size={34} />
      <AppText style={styles.actionLabel} variant="caption">
        {label}
      </AppText>
    </Pressable>
  );
}

export function ExplorePostCard({
  post,
  height,
  viewerId,
  authorFollowStatus,
  onCommentPress,
  onLikePress,
  onAuthorPress,
  onSharePress,
  onFollowPress,
  onReportPress,
  isFollowLoading,
  isLiked,
  likeCount,
  commentCount,
}: ExplorePostCardProps) {
  const authorLabel = post.author.username || post.author.displayName;
  const initials = post.author.displayName.slice(0, 2).toUpperCase();
  const isOwnPost = Boolean(viewerId && post.author.id === viewerId);
  const isReel = post.type === "reel";
  const isFollowing = Boolean(authorFollowStatus?.iFollow);
  const hasSnapMedia = Boolean(post.frontMediaUrl && post.backMediaUrl);
  const hasReelMedia = isReel && post.media.length > 0;
  const liked = isLiked ?? post.viewerState.liked;
  const visibleLikeCount = likeCount ?? post.stats.likeCount;
  const visibleCommentCount = commentCount ?? post.stats.commentCount;
  const likeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!liked) {
      return;
    }
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.26, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
  }, [likeScale, liked]);

  return (
    <View style={[styles.card, height ? { height } : undefined]}>
      {hasReelMedia ? (
        <View style={styles.reelMediaWrap}>
          <MediaCarousel
            autoPlayVideo
            height={height}
            isFocused
            media={post.media.map((item) => ({
              id: item.id,
              url: item.url,
              type: item.type === "video" ? "VIDEO" : "IMAGE",
            }))}
          />
        </View>
      ) : hasSnapMedia ? (
        <BeRealSnapMedia backMediaUrl={post.backMediaUrl!} frontMediaUrl={post.frontMediaUrl!} />
      ) : (
        <View style={styles.visualCenter}>
          <AppText style={styles.visualNumber}>{isReel ? "Reel" : "Snap"}</AppText>
        </View>
      )}

      <View style={styles.actionRail}>
        <View style={styles.profileAction}>
          <Pressable onPress={onAuthorPress}>
            <Avatar initials={initials} size="md" uri={post.author.avatarUrl} />
          </Pressable>
          {!isOwnPost ? (
            isFollowing ? (
              <View style={[styles.followDot, styles.followDotActive]}>
                <Ionicons color="#FFFFFF" name="checkmark" size={14} />
              </View>
            ) : (
              <Pressable disabled={isFollowLoading} onPress={onFollowPress} style={styles.followDot}>
                <Ionicons color="#FFFFFF" name="add" size={14} />
              </Pressable>
            )
          ) : null}
        </View>
        <Pressable onPress={onLikePress} style={styles.actionButton}>
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Ionicons color={liked ? "#FF375F" : "#FFFFFF"} name={liked ? "heart" : "heart-outline"} size={34} />
          </Animated.View>
          <AppText style={styles.actionLabel} variant="caption">
            {formatCount(visibleLikeCount)}
          </AppText>
        </Pressable>
        <ActionButton icon="chatbubble-outline" label={formatCount(visibleCommentCount)} onPress={onCommentPress} />
        <ActionButton icon="share-social-outline" label="Paylaş" onPress={onSharePress} />
        {!isOwnPost && !isReel && onReportPress ? (
          <ActionButton icon="flag-outline" label="Şikayet" onPress={onReportPress} />
        ) : null}
      </View>

      <View style={styles.captionBlock}>
        <Pressable onPress={onAuthorPress}>
          <VerifiedNameRow
            accountType={post.author.accountType}
            badgeSize={15}
            isOrganizer={post.author.isOrganizer}
            name={`@${authorLabel}`}
            style={styles.usernameRow}
            textStyle={styles.username}
            verificationBadge={post.author.verificationBadge}
          />
        </Pressable>
        <AppText style={styles.caption} variant="body">
          {post.text}
        </AppText>
        {post.event ? (
          <AppText numberOfLines={1} style={styles.eventTag} variant="caption">
            {post.event.title}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#151517",
    flex: 1,
    justifyContent: "flex-end",
    overflow: "hidden",
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  reelMediaWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  visualCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  visualNumber: {
    color: "#FFFFFF",
    fontSize: 76,
    fontWeight: "700",
  },
  actionRail: {
    alignItems: "center",
    bottom: 104,
    gap: theme.spacing.lg,
    position: "absolute",
    right: theme.spacing.lg,
  },
  profileAction: {
    alignItems: "center",
  },
  followDot: {
    alignItems: "center",
    backgroundColor: "#FF365F",
    borderColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 2,
    bottom: -4,
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: -4,
    width: 20,
  },
  followDotActive: {
    backgroundColor: "#6B7280",
  },
  actionButton: {
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  actionLabel: {
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
  },
  captionBlock: {
    alignItems: "flex-start",
    paddingRight: 84,
  },
  usernameRow: {
    maxWidth: "100%",
  },
  username: {
    color: "#FFFFFF",
    fontSize: 17,
    marginBottom: theme.spacing.xs,
  },
  caption: {
    color: "#F3F4F6",
  },
  eventTag: {
    color: "#E5E7EB",
    marginTop: theme.spacing.xs,
    opacity: 0.9,
  },
});
