import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
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
  onMessagePress?: () => void;
  onFollowPress?: () => void;
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
  onMessagePress,
  onFollowPress,
  isFollowLoading,
  isLiked,
  likeCount,
  commentCount,
}: ExplorePostCardProps) {
  const authorLabel = post.author.username || post.author.displayName;
  const initials = post.author.displayName.slice(0, 2).toUpperCase();
  const isOwnPost = Boolean(viewerId && post.author.id === viewerId);
  const isFollowing = Boolean(authorFollowStatus?.iFollow);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const hasMedia = post.media.length > 0;
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
      {hasMedia ? (
        <View
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            if (width > 0 && width !== carouselWidth) {
              setCarouselWidth(width);
            }
          }}
          style={styles.mediaLayer}
        >
          <ScrollView
            horizontal
            onMomentumScrollEnd={(event) => {
              if (carouselWidth <= 0) {
                return;
              }
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
              setActiveMediaIndex(nextIndex);
            }}
            pagingEnabled
            showsHorizontalScrollIndicator={false}
          >
            {post.media.map((media) => (
              <Image key={media.id} resizeMode="cover" source={{ uri: media.url }} style={[styles.mediaImage, carouselWidth > 0 ? { width: carouselWidth } : undefined]} />
            ))}
          </ScrollView>
          {post.media.length > 1 ? (
            <View style={styles.mediaDots}>
              {post.media.map((media, index) => (
                <View key={`${media.id}_${index}`} style={[styles.mediaDot, activeMediaIndex === index && styles.mediaDotActive]} />
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.visualCenter}>
          <AppText style={styles.visualNumber}>Snap</AppText>
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
        <ActionButton icon="paper-plane-outline" label="Mesaj" onPress={onMessagePress} />
      </View>

      <View style={styles.captionBlock}>
        <Pressable onPress={onAuthorPress}>
          <AppText style={styles.username} variant="label">
            @{authorLabel}
          </AppText>
        </Pressable>
        <AppText style={styles.caption} variant="body">
          {post.text}
        </AppText>
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
  visualCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaImage: {
    height: "100%",
  },
  mediaDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    left: 0,
    position: "absolute",
    right: 0,
    top: 72,
    justifyContent: "center",
  },
  mediaDot: {
    backgroundColor: "rgba(255, 255, 255, 0.36)",
    borderRadius: 4,
    height: 6,
    width: 6,
  },
  mediaDotActive: {
    backgroundColor: "#FFFFFF",
    width: 16,
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
  username: {
    color: "#FFFFFF",
    fontSize: 17,
    marginBottom: theme.spacing.xs,
  },
  caption: {
    color: "#F3F4F6",
  },
});
