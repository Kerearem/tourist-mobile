import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import {
  ALLOWED_MESSAGE_REACTIONS,
  type AllowedMessageReaction,
  type ConversationMessage,
} from "../types";

type Props = {
  message: ConversationMessage | null;
  onClose: () => void;
  onReply: (message: ConversationMessage) => void;
  onReaction: (message: ConversationMessage, emoji: AllowedMessageReaction) => void;
};

export function MessageActionSheet({ message, onClose, onReply, onReaction }: Props) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={message != null}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <View style={styles.wrap}>
          <Pressable style={styles.sheet}>
            <View style={styles.reactionRow}>
              {ALLOWED_MESSAGE_REACTIONS.map((emoji) => {
                const selected = message?.reactions?.some(
                  (reaction) => reaction.emoji === emoji && reaction.reactedByMe,
                );
                return (
                  <Pressable
                    accessibilityLabel={`${emoji} tepkisi`}
                    key={emoji}
                    onPress={() => {
                      if (message) {
                        onReaction(message, emoji);
                      }
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
            <Pressable
              onPress={() => {
                if (message) {
                  onReply(message);
                }
              }}
              style={styles.replyRow}
            >
              <AppText style={styles.replyText} variant="body">
                Yanıtla
              </AppText>
            </Pressable>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <AppText style={styles.cancelText} variant="body">
              Vazgeç
            </AppText>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    flex: 1,
    justifyContent: "flex-end",
  },
  wrap: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  sheet: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    overflow: "hidden",
  },
  reactionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  reactionButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  reactionButtonSelected: {
    backgroundColor: "#EDE9FE",
    borderColor: "#7C3AED",
    borderWidth: 1,
  },
  reactionEmoji: {
    fontSize: 22,
  },
  replyRow: {
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  replyText: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    textAlign: "center",
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
  },
  cancelText: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
  },
});
