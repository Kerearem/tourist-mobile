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
  // Light footer only on the solid purple bubble; announcement/media/incoming use subtle gray.
  const useLightFooter = isMine && !isAnnouncement;

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

  // WhatsApp-style footer inside the bubble, bottom-right: time + outgoing ticks.
  const bubbleFooter =
    timeLabel || receiptTick ? (
      <View style={[styles.bubbleFooter, hasMedia && styles.bubbleFooterOnMedia]}>
        {timeLabel ? (
          <AppText
            style={[styles.footerTime, useLightFooter ? styles.footerTimeLight : null]}
            variant="caption"
          >
            {timeLabel}
          </AppText>
        ) : null}
        {receiptTick ? (
          <Ionicons color={receiptTick.color} name={receiptTick.icon} size={14} />
        ) : null}
      </View>
    ) : null;

  const bubbleBody = (
    <View style={bubbleStyles}>
      {message.replyTo ? (
        <View
          style={[
            styles.replyPreview,
            isMine && !isAnnouncement ? styles.replyPreviewMine : null,
          ]}
        >
          <AppText
            style={[
              styles.replySender,
              isMine && !isAnnouncement ? styles.replyTextMine : null,
            ]}
            variant="caption"
          >
            {message.replyTo.sender.displayName}
          </AppText>
          <AppText
            numberOfLines={2}
            style={[
              styles.replyText,
              isMine && !isAnnouncement ? styles.replyTextMine : null,
            ]}
            variant="caption"
          >
            {message.replyTo.text}
          </AppText>
        </View>
      ) : null}
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
      {bubbleFooter}
    </View>
  );

  const bubbleContent = (
    <Pressable disabled={!onLongPress} onLongPress={onLongPress}>
      {isAnnouncement ? <AnnouncementLabel /> : null}
      {bubbleBody}
      {message.reactions && message.reactions.length > 0 ? (
        <View style={[styles.reactionsRow, isMine && styles.reactionsRowMine]}>
          {message.reactions.map((reaction) => (
            <View
              key={reaction.emoji}
              style={[styles.reactionChip, reaction.reactedByMe && styles.reactionChipMine]}
            >
              <AppText style={styles.reactionChipText} variant="caption">
                {reaction.emoji}
                {reaction.count > 1 ? ` ${reaction.count}` : ""}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );

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
        <View style={styles.dmIncomingContent}>{bubbleContent}</View>
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
  bubbleFooter: {
    alignItems: "center",
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: 3,
    marginTop: 2,
  },
  bubbleFooterOnMedia: {
    paddingBottom: 4,
    paddingRight: theme.spacing.sm,
  },
  replyPreview: {
    backgroundColor: "#F3F4F6",
    borderLeftColor: "#94A3B8",
    borderLeftWidth: 3,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  replyPreviewMine: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderLeftColor: "rgba(255, 255, 255, 0.72)",
  },
  replySender: {
    color: "#5B3CF6",
    fontWeight: "700",
  },
  replyText: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  replyTextMine: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: -4,
  },
  reactionsRowMine: {
    justifyContent: "flex-end",
  },
  reactionChip: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  reactionChipMine: {
    backgroundColor: "#EDE9FE",
    borderColor: "#8B5CF6",
  },
  reactionChipText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
  },
  footerTime: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  footerTimeLight: {
    color: "rgba(255, 255, 255, 0.75)",
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
