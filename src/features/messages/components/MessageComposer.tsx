import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "../../../constants/theme";

type MessageComposerProps = {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
};

export function MessageComposer({ onSend, disabled = false }: MessageComposerProps) {
  const [text, setText] = useState("");
  const hasText = Boolean(text.trim());

  const handleSend = async () => {
    if (!hasText || disabled) {
      return;
    }
    const next = text;
    setText("");
    await onSend(next);
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.cameraButton}>
        <Ionicons color={theme.colors.textPrimary} name="camera-outline" size={20} />
      </Pressable>

      <View style={styles.composerBody}>
        <TextInput
          editable={!disabled}
          onChangeText={setText}
          onSubmitEditing={() => void handleSend()}
          placeholder="Mesaj..."
          placeholderTextColor={theme.colors.muted}
          style={styles.input}
          value={text}
        />

        <View style={styles.rightActions}>
          <Pressable style={styles.inlineIconButton}>
            <Ionicons color={theme.colors.textSecondary} name="image-outline" size={20} />
          </Pressable>
          <Pressable
            disabled={disabled || !hasText}
            onPress={() => void handleSend()}
            style={[styles.trailingActionButton, hasText ? styles.trailingSendButton : styles.trailingMicButton]}
          >
            <Ionicons
              color={hasText ? "#FFFFFF" : theme.colors.textPrimary}
              name={hasText ? "paper-plane-outline" : "mic-outline"}
              size={20}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 56,
  },
  cameraButton: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  composerBody: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 28,
    flex: 1,
    flexDirection: "row",
    minHeight: 56,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.sm,
  },
  input: {
    color: theme.colors.textPrimary,
    flex: 1,
    ...theme.typography.body,
  },
  rightActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  inlineIconButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  trailingActionButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  trailingMicButton: {
    backgroundColor: "#FFFFFF",
  },
  trailingSendButton: {
    backgroundColor: "#5B3CF6",
  },
});
