import React from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { ConversationMessage } from "../types";
import { resolveMessageReceiptTickVisual } from "../utils/messageReceiptTicks";

type MessageBubbleProps = {
  message: ConversationMessage;
  isMine: boolean;
  variant?: "dm" | "group";
  /** DM: show sender avatar for this incoming bubble (cluster tail). */
  showIncomingAvatar?: boolean;
  /** Tighter vertical spacing when continuing the same sender cluster. */
  isClusterContinuation?: boolean;
  onLongPress?: () => void;
  onImagePress?: (imageUrl: string) => void;
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

export function MessageBubble({
  message,
  isMine,
  variant = "dm",
  showIncomingAvatar = false,
  isClusterContinuation = false,
  onLongPress,
  onImagePress,
}: MessageBubbleProps) {
  if (message.type === "system") {
    return (
      <View style={styles.systemWrap}>
        <View style={styles.systemBadge}>
          <AppText style={styles.systemBadgeText} variant="caption">
            Tourist
          </AppText>
        </View>
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
  const hasMedia = Boolean(message.mediaUrl);
  const hasText = Boolean(message.text?.trim());
  const receiptTick = isMine ? resolveMessageReceiptTickVisual(message.status) : null;

  const bubbleStyles = [
    styles.bubble,
    hasMedia && styles.bubbleWithMedia,
    isAnnouncement
      ? isMine
        ? styles.bubbleAnnouncementMine
        : styles.bubbleAnnouncementOther
      : isMine
        ? styles.bubbleMine
        : styles.bubbleOther,
  ];

  const bubbleBody = (
    <View style={bubbleStyles}>
      {hasMedia ? (
        <Pressable
          disabled={!onImagePress}
          onPress={() => {
            if (message.mediaUrl) {
              onImagePress?.(message.mediaUrl);
            }
          }}
        >
          <Image resizeMode="cover" source={{ uri: message.mediaUrl }} style={styles.messageImage} />
        </Pressable>
      ) : null}
      {hasText ? (
        <AppText
          style={[
            isMine && !isAnnouncement && !hasMedia ? styles.textMine : undefined,
            hasMedia && hasText ? styles.captionText : undefined,
          ]}
          variant="body"
        >
          {message.text}
        </AppText>
      ) : null}
    </View>
  );

  const bubbleContent = (
    <Pressable disabled={!onLongPress} onLongPress={onLongPress}>
      {isAnnouncement ? <AnnouncementLabel /> : null}
      {bubbleBody}
    </Pressable>
  );

  const dmMetaRow =
    !isGroup && (timeLabel || receiptTick) ? (
      <View style={[styles.dmMetaRow, isMine ? styles.dmMetaRowMine : styles.dmMetaRowOther]}>
        {timeLabel ? (
          <AppText style={styles.timeLabel} variant="caption">
            {timeLabel}
          </AppText>
        ) : null}
        {receiptTick ? (
          <Ionicons color={receiptTick.color} name={receiptTick.icon} size={14} />
        ) : null}
      </View>
    ) : null;

  if (showSenderMeta) {
    return (
      <View style={[styles.groupRow, isClusterContinuation && styles.clusterContinuation]}>
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

  if (!isGroup && !isMine) {
    return (
      <View style={[styles.dmIncomingRow, isClusterContinuation && styles.clusterContinuation]}>
        <View style={styles.dmAvatarSlot}>
          {showIncomingAvatar ? (
            <Avatar initials={initials} size={28} uri={message.sender.avatarUrl} />
          ) : null}
        </View>
        <View style={styles.dmIncomingContent}>
          {bubbleContent}
          {dmMetaRow}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.row,
        isMine ? styles.rowMine : styles.rowOther,
        isClusterContinuation && styles.clusterContinuation,
      ]}
    >
      {bubbleContent}
      {isGroup && timeLabel ? (
        <AppText style={[styles.timeLabel, isMine && styles.timeLabelMine]} variant="caption">
          {timeLabel}
        </AppText>
      ) : (
        dmMetaRow
      )}
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
  clusterContinuation: {
    marginBottom: theme.spacing.xs,
  },
  dmIncomingRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    width: "100%",
  },
  dmAvatarSlot: {
    height: 28,
    justifyContent: "flex-end",
    width: 28,
  },
  dmIncomingContent: {
    maxWidth: "78%",
  },
  dmMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 2,
  },
  dmMetaRowMine: {
    alignSelf: "flex-end",
  },
  dmMetaRowOther: {
    alignSelf: "flex-start",
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
    overflow: "hidden",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  bubbleWithMedia: {
    paddingHorizontal: 4,
    paddingVertical: 4,
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
  messageImage: {
    borderRadius: 16,
    height: 220,
    width: 220,
  },
  captionText: {
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  textMine: {
    color: "#FFFFFF",
  },
  timeLabel: {
    color: theme.colors.textSecondary,
    marginTop: 0,
  },
  timeLabelMine: {
    alignSelf: "flex-end",
  },
  systemWrap: {
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  systemBadge: {
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  systemBadgeText: {
    color: "#4338CA",
    fontWeight: "700",
  },
  systemText: {
    color: theme.colors.textSecondary,
    lineHeight: 18,
    textAlign: "center",
  },
});
