import React from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { ConversationMessage } from "../types";

type MessageBubbleProps = {
  message: ConversationMessage;
  isMine: boolean;
};

export function MessageBubble({ message, isMine }: MessageBubbleProps) {
  if (message.type === "system") {
    return (
      <View style={styles.systemWrap}>
        <AppText style={styles.systemText} variant="caption">
          {message.text}
        </AppText>
      </View>
    );
  }

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        <AppText style={isMine ? styles.textMine : undefined} variant="body">
          {message.text}
        </AppText>
      </View>
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
  bubble: {
    borderRadius: 20,
    maxWidth: "82%",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  bubbleMine: {
    backgroundColor: "#5B3CF6",
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 6,
    shadowColor: "#000000",
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  textMine: {
    color: "#FFFFFF",
  },
  systemWrap: {
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  systemText: {
    color: theme.colors.textSecondary,
  },
});
