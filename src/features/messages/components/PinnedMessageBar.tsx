import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { ConversationMessage } from "../types";

type PinnedMessageBarProps = {
  message: ConversationMessage;
  canUnpin: boolean;
  onPress: () => void;
  onUnpin: () => void;
};

export function PinnedMessageBar({ message, canUnpin, onPress, onUnpin }: PinnedMessageBarProps) {
  return (
    <View style={styles.container}>
      <Pressable onPress={onPress} style={styles.content}>
        <Ionicons color="#1D4ED8" name="pin" size={16} style={styles.pinIcon} />
        <View style={styles.textWrap}>
          <AppText numberOfLines={1} style={styles.label} variant="caption">
            Sabitlenmiş mesaj
          </AppText>
          <AppText numberOfLines={1} style={styles.preview} variant="caption">
            {message.isAnnouncement ? "📢 " : ""}
            {message.text}
          </AppText>
        </View>
      </Pressable>
      {canUnpin ? (
        <Pressable hitSlop={8} onPress={onUnpin} style={styles.unpinButton}>
          <Ionicons color={theme.colors.textSecondary} name="close" size={18} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderBottomColor: "#DBEAFE",
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 52,
    paddingHorizontal: theme.spacing.md,
  },
  content: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  pinIcon: {
    transform: [{ rotate: "45deg" }],
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: "#1D4ED8",
    fontWeight: "700",
  },
  preview: {
    color: theme.colors.textPrimary,
  },
  unpinButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
});
