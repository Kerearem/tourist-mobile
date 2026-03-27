import React from "react";
import { StyleSheet, View } from "react-native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { ExplorePost } from "../types";

type ExplorePostCardProps = {
  post: ExplorePost;
};

export function ExplorePostCard({ post }: ExplorePostCardProps) {
  const initials = post.author.displayName.slice(0, 2).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar initials={initials} size={40} uri={post.author.avatarUrl} />
        <View style={styles.headerText}>
          <AppText style={styles.author}>{post.author.displayName}</AppText>
          <AppText muted style={styles.meta}>
            {post.community} - {post.city}, {post.countryCode}
          </AppText>
        </View>
      </View>

      <AppText style={styles.body}>{post.text}</AppText>

      {post.media.map((media) => (
        <View key={media.id} style={styles.mediaBox}>
          <AppText muted>{media.type === "video" ? "Video placeholder" : "Image placeholder"}</AppText>
        </View>
      ))}

      <View style={styles.footer}>
        <AppText muted>
          {post.stats.likeCount} likes - {post.stats.commentCount} comments
        </AppText>
        <AppText muted>{post.scope === "city" ? "City feed" : "Country feed"}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
    marginBottom: 12,
    padding: 12,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  author: {
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
  body: {
    lineHeight: 22,
  },
  mediaBox: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    height: 180,
    justifyContent: "center",
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
