import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import {
  ALLOWED_MESSAGE_REACTIONS,
  type AllowedMessageReaction,
  type ConversationMessage,
} from "../types";

type Props = {
  message: ConversationMessage | null;
  isMine?: boolean;
  onClose: () => void;
  onReply: (message: ConversationMessage) => void;
  onCopy: (message: ConversationMessage) => void;
  onDelete: (message: ConversationMessage) => void;
  onReaction: (message: ConversationMessage, emoji: AllowedMessageReaction) => void;
};

const formatPreviewTime = (createdAt?: string) => {
  if (!createdAt) {
    return "";
  }
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getPreviewText = (message: ConversationMessage) => {
  if (message.isDeleted) {
    return "Bu mesaj silindi";
  }
  if (message.mediaUrl && !message.text?.trim()) {
    return "📷 Fotoğraf";
  }
  return message.text?.trim() || "Mesaj";
};

export function MessageActionSheet({
  message,
  isMine = false,
  onClose,
  onReply,
  onCopy,
  onDelete,
  onReaction,
}: Props) {
  if (!message) {
    return null;
  }

  const isDeleted = Boolean(message.isDeleted);
  const canCopy = Boolean(message.text?.trim()) && !isDeleted;
  const canDelete = isMine && !isDeleted;
  const previewTime = formatPreviewTime(message.createdAt);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={message != null}>
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={styles.backdrop} />
        <View style={[styles.content, isMine && styles.contentMine]}>
          {!isDeleted ? (
            <View style={styles.reactionWrap}>
              <View style={styles.reactionRow}>
                {ALLOWED_MESSAGE_REACTIONS.map((emoji) => {
                  const selected = message.reactions?.some(
                    (reaction) => reaction.emoji === emoji && reaction.reactedByMe,
                  );
                  return (
                    <Pressable
                      accessibilityLabel={`${emoji} tepkisi`}
                      key={emoji}
                      onPress={() => {
                        onReaction(message, emoji);
                      }}
                      style={[styles.reactionButton, selected && styles.reactionButtonSelected]}
                    >
                      <AppText style={styles.reactionEmoji} variant="body">
                        {emoji}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={[styles.previewBubble, isMine && styles.previewBubbleMine]}>
            <AppText
              numberOfLines={2}
              style={[styles.previewText, isMine && styles.previewTextMine]}
              variant="body"
            >
              {getPreviewText(message)}
            </AppText>
            {previewTime ? (
              <AppText style={[styles.previewTime, isMine && styles.previewTimeMine]} variant="caption">
                {previewTime}
              </AppText>
            ) : null}
          </View>

          <View style={styles.menuCard}>
            {!isDeleted ? (
              <Pressable
                onPress={() => {
                onReply(message);
              }}
              style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
            >
              <Ionicons color={theme.colors.textPrimary} name="return-up-back-outline" size={22} />
              <AppText style={styles.optionText} variant="body">
                Cevapla
              </AppText>
              </Pressable>
            ) : null}

            <Pressable
              disabled={!canCopy}
              onPress={() => {
                onCopy(message);
              }}
              style={({ pressed }) => [
                styles.optionRow,
                !canCopy && styles.optionRowDisabled,
                pressed && canCopy && styles.optionRowPressed,
              ]}
            >
              <Ionicons color={canCopy ? theme.colors.textPrimary : theme.colors.muted} name="copy-outline" size={22} />
              <AppText style={[styles.optionText, !canCopy && styles.optionTextDisabled]} variant="body">
                Kopyala
              </AppText>
            </Pressable>

            {canDelete ? (
              <Pressable
                onPress={() => {
                  onDelete(message);
                }}
                style={({ pressed }) => [styles.optionRow, pressed && styles.optionRowPressed]}
              >
                <Ionicons color="#FB7185" name="trash-outline" size={22} />
                <AppText style={[styles.optionText, styles.deleteText]} variant="body">
                  Sil
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    // Light dim so the chat behind stays visible; no native blur dependency.
    backgroundColor: "rgba(17, 24, 39, 0.14)",
  },
  content: {
    alignItems: "flex-start",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  contentMine: {
    alignItems: "flex-end",
  },
  reactionWrap: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(17, 24, 39, 0.08)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: "#111827",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  reactionRow: {
    flexDirection: "row",
    gap: 4,
  },
  reactionButton: {
    alignItems: "center",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  reactionButtonSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "#5B3CF6",
    borderWidth: 1,
  },
  reactionEmoji: {
    fontSize: 30,
    lineHeight: 36,
  },
  previewBubble: {
    alignItems: "flex-end",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderColor: "rgba(17, 24, 39, 0.08)",
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: "row",
    gap: theme.spacing.sm,
    maxWidth: "82%",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  previewBubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "#5B3CF6",
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  previewText: {
    color: theme.colors.textPrimary,
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  previewTextMine: {
    color: "#FFFFFF",
  },
  previewTime: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  previewTimeMine: {
    color: "rgba(255, 255, 255, 0.72)",
  },
  menuCard: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderColor: "rgba(17, 24, 39, 0.08)",
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 230,
    overflow: "hidden",
    paddingVertical: theme.spacing.xs,
    shadowColor: "#111827",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
  },
  optionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  optionRowPressed: {
    backgroundColor: "#F3F4F6",
  },
  optionRowDisabled: {
    opacity: 0.55,
  },
  optionText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  optionTextDisabled: {
    color: theme.colors.muted,
  },
  deleteText: {
    color: "#FB7185",
  },
});
