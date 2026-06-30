import React from "react";
import { StyleSheet, View } from "react-native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { EventAlbumMoment } from "../types";
import { MomentMediaCarousel } from "./MomentMediaCarousel";

type EventMomentCardProps = {
  moment: EventAlbumMoment;
};

const formatMomentDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function EventMomentCard({ moment }: EventMomentCardProps) {
  const initials = moment.author.displayName.slice(0, 2).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar initials={initials} size="sm" uri={moment.author.avatarUrl ?? undefined} />
        <View style={styles.headerText}>
          <AppText variant="label">{moment.author.displayName}</AppText>
          <AppText variant="caption">{formatMomentDate(moment.createdAt)}</AppText>
        </View>
      </View>

      <MomentMediaCarousel media={moment.media} />

      {moment.caption?.trim() ? (
        <AppText style={styles.caption} variant="body">
          {moment.caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  caption: {
    color: theme.colors.textPrimary,
  },
});
