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
        <AppText muted style={styles.systemText}>
          {message.text}
        </AppText>
      </View>
    );
  }

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        <AppText style={isMine ? styles.textMine : undefined}>{message.text}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 8,
    width: "100%",
  },
  rowMine: {
    alignItems: "flex-end",
  },
  rowOther: {
    alignItems: "flex-start",
  },
  bubble: {
    borderRadius: 12,
    maxWidth: "82%",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bubbleMine: {
    backgroundColor: theme.colors.primary,
  },
  bubbleOther: {
    backgroundColor: "#F3F4F6",
  },
  textMine: {
    color: "#FFFFFF",
  },
  systemWrap: {
    alignItems: "center",
    marginBottom: 8,
  },
  systemText: {
    fontSize: 13,
  },
});
