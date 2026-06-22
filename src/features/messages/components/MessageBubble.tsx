import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { ConversationMessage } from "../types";

type MessageBubbleProps = {
  message: ConversationMessage;
  isMine: boolean;
  variant?: "dm" | "group";
  onLongPress?: () => void;
};

const formatMessageTime = (createdAt: string) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const AnnouncementLabel = () => (
  <View style={styles.announcementLabel}>
    <AppText style={styles.announcementLabelText} variant="caption">
      📢 Duyuru
    </AppText>
  </View>
);

export function MessageBubble({ message, isMine, variant = "dm", onLongPress }: MessageBubbleProps) {
  if (message.type === "system") {
    return (
      <View style={styles.systemWrap}>
        <AppText style={styles.systemText} variant="caption">
          {message.text}
        </AppText>
      </View>
    );
  }

  const timeLabel = formatMessageTime(message.createdAt);
  const isGroup = variant === "group";
  const showSenderMeta = isGroup && !isMine;
  const initials = message.sender.displayName.slice(0, 2).toUpperCase();
  const isOrganizer = message.sender.role === "ORGANIZER";
  const isAnnouncement = Boolean(message.isAnnouncement);

  const bubbleStyles = [
    styles.bubble,
    isAnnouncement
      ? isMine
        ? styles.bubbleAnnouncementMine
        : styles.bubbleAnnouncementOther
      : isMine
        ? styles.bubbleMine
        : styles.bubbleOther,
  ];

  const bubbleContent = (
    <Pressable disabled={!onLongPress} onLongPress={onLongPress}>
      {isAnnouncement ? <AnnouncementLabel /> : null}
      <View style={bubbleStyles}>
        <AppText style={isMine && !isAnnouncement ? styles.textMine : undefined} variant="body">
          {message.text}
        </AppText>
      </View>
    </Pressable>
  );

  if (showSenderMeta) {
    return (
      <View style={styles.groupRow}>
        <Avatar initials={initials} size={36} uri={message.sender.avatarUrl} />
        <View style={styles.groupContent}>
          <View style={styles.senderMeta}>
            <AppText style={styles.senderName} variant="caption">
              {message.sender.displayName}
            </AppText>
            {isOrganizer ? (
              <View style={styles.organizerBadge}>
                <AppText style={styles.organizerBadgeText} variant="caption">
                  Organizatör
                </AppText>
              </View>
            ) : null}
          </View>
          {bubbleContent}
          {timeLabel ? (
            <AppText style={styles.timeLabel} variant="caption">
              {timeLabel}
            </AppText>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
      {bubbleContent}
      {isGroup && timeLabel ? (
        <AppText style={[styles.timeLabel, isMine && styles.timeLabelMine]} variant="caption">
          {timeLabel}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: theme.spacing.lg,
    width: "100%",
  },
  rowMine: {
    alignItems: "flex-end",
  },
  rowOther: {
    alignItems: "flex-start",
  },
  groupRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
    width: "100%",
  },
  groupContent: {
    flex: 1,
    gap: 4,
    maxWidth: "82%",
  },
  senderMeta: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  senderName: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
  },
  organizerBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  organizerBadgeText: {
    color: "#1D4ED8",
    fontSize: 10,
    fontWeight: "700",
  },
  announcementLabel: {
    alignSelf: "flex-start",
    backgroundColor: "#FDE68A",
    borderRadius: 999,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  announcementLabelText: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "700",
  },
  bubble: {
    borderRadius: 20,
    maxWidth: "100%",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  bubbleMine: {
    backgroundColor: "#5B3CF6",
    borderBottomRightRadius: 6,
    maxWidth: "82%",
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 6,
    shadowColor: "#000000",
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  bubbleAnnouncementMine: {
    backgroundColor: "#FEF3C7",
    borderBottomRightRadius: 6,
    borderColor: "#FCD34D",
    borderWidth: 1,
    maxWidth: "82%",
  },
  bubbleAnnouncementOther: {
    backgroundColor: "#FEF3C7",
    borderBottomLeftRadius: 6,
    borderColor: "#FCD34D",
    borderWidth: 1,
  },
  textMine: {
    color: "#FFFFFF",
  },
  timeLabel: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  timeLabelMine: {
    alignSelf: "flex-end",
  },
  systemWrap: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  systemText: {
    color: theme.colors.textSecondary,
  },
});
