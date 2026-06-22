import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

type MessageComposerProps = {
  onSend: (text: string, options?: { isAnnouncement?: boolean }) => Promise<void>;
  disabled?: boolean;
  textOnly?: boolean;
  showAnnouncementOption?: boolean;
  showLiveCameraButton?: boolean;
  onCameraPress?: (caption: string) => void;
  isPhotoUploading?: boolean;
  resetToken?: number;
};

export function MessageComposer({
  onSend,
  disabled = false,
  textOnly = false,
  showAnnouncementOption = false,
  showLiveCameraButton = false,
  onCameraPress,
  isPhotoUploading = false,
  resetToken = 0,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [announcementMode, setAnnouncementMode] = useState(false);
  const hasText = Boolean(text.trim());
  const isBusy = disabled || isPhotoUploading;

  useEffect(() => {
    setText("");
    setAnnouncementMode(false);
  }, [resetToken]);

  const handleSend = async () => {
    if (!hasText || isBusy) {
      return;
    }
    const next = text;
    const sendAsAnnouncement = announcementMode;
    setText("");
    setAnnouncementMode(false);
    await onSend(next, sendAsAnnouncement ? { isAnnouncement: true } : undefined);
  };

  return (
    <View style={styles.wrapper}>
      {showAnnouncementOption ? (
        <Pressable
          disabled={isBusy}
          onPress={() => setAnnouncementMode((current) => !current)}
          style={[styles.announcementButton, announcementMode && styles.announcementButtonActive]}
        >
          <AppText
            style={[styles.announcementButtonText, announcementMode && styles.announcementButtonTextActive]}
            variant="caption"
          >
            📢 Duyuru Yap
          </AppText>
        </Pressable>
      ) : null}

      <View style={styles.container}>
        {showLiveCameraButton ? (
          <Pressable
            disabled={isBusy}
            onPress={() => onCameraPress?.(text.trim())}
            style={[styles.cameraButton, isPhotoUploading && styles.cameraButtonBusy]}
          >
            {isPhotoUploading ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            ) : (
              <Ionicons color={theme.colors.textPrimary} name="camera-outline" size={20} />
            )}
          </Pressable>
        ) : !textOnly ? (
          <Pressable style={styles.cameraButton}>
            <Ionicons color={theme.colors.textPrimary} name="camera-outline" size={20} />
          </Pressable>
        ) : null}

        <View style={[styles.composerBody, announcementMode && styles.composerBodyAnnouncement]}>
          <TextInput
            editable={!isBusy}
            onChangeText={setText}
            onSubmitEditing={() => void handleSend()}
            placeholder={announcementMode ? "Duyuru metni..." : "Mesaj..."}
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            value={text}
          />

          <View style={styles.rightActions}>
            {!textOnly && !showLiveCameraButton ? (
              <Pressable style={styles.inlineIconButton}>
                <Ionicons color={theme.colors.textSecondary} name="image-outline" size={20} />
              </Pressable>
            ) : null}
            <Pressable
              disabled={isBusy || !hasText}
              onPress={() => void handleSend()}
              style={[
                styles.trailingActionButton,
                hasText ? (announcementMode ? styles.trailingAnnouncementButton : styles.trailingSendButton) : styles.trailingMicButton,
              ]}
            >
              <Ionicons
                color={hasText ? "#FFFFFF" : theme.colors.textPrimary}
                name={hasText || textOnly || showLiveCameraButton ? "paper-plane-outline" : "mic-outline"}
                size={20}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.sm,
  },
  announcementButton: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  announcementButtonActive: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
    borderWidth: 1,
  },
  announcementButtonText: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
  },
  announcementButtonTextActive: {
    color: "#92400E",
  },
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
  cameraButtonBusy: {
    opacity: 0.85,
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
  composerBodyAnnouncement: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
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
  trailingAnnouncementButton: {
    backgroundColor: "#D97706",
  },
});
