import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { AppButton } from "../ui/AppButton";
import { AppText } from "../ui/AppText";
import { theme } from "../../constants/theme";
import { getMediaContentContract, type UserContentMediaKind } from "../../services/media/mediaContentContracts";
import { MediaPreviewFrame } from "./MediaPreviewFrame";

export type MediaUploadPreviewItem = {
  uri: string;
  type: "IMAGE" | "VIDEO";
};

type MediaUploadPreviewModalProps = {
  visible: boolean;
  media: MediaUploadPreviewItem | null;
  kind: UserContentMediaKind;
  onConfirm: () => void;
  onRetake: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  retakeLabel?: string;
};

export function MediaUploadPreviewModal({
  visible,
  media,
  kind,
  onConfirm,
  onRetake,
  onCancel,
  confirmLabel = "Kullan",
  retakeLabel = "Tekrar Seç",
}: MediaUploadPreviewModalProps) {
  const contract = getMediaContentContract(kind);

  if (!media) {
    return null;
  }

  return (
    <Modal animationType="slide" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <AppText variant="sectionTitle">Önizleme</AppText>
          <AppText style={styles.guidance} variant="bodyMuted">
            {contract.previewGuidance}
          </AppText>

          <MediaPreviewFrame kind={kind} type={media.type} uri={media.uri} />

          {media.type === "VIDEO" && contract.videoAspectWarning ? (
            <AppText style={styles.warning} variant="caption">
              {contract.videoAspectWarning}
            </AppText>
          ) : null}

          <View style={styles.actions}>
            <AppButton label={confirmLabel} onPress={onConfirm} />
            <Pressable onPress={onRetake} style={styles.secondaryButton}>
              <AppText style={styles.secondaryButtonText} variant="label">
                {retakeLabel}
              </AppText>
            </Pressable>
            <Pressable onPress={onCancel} style={styles.secondaryButton}>
              <AppText style={styles.cancelText} variant="label">
                Vazgeç
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.55)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  guidance: {
    color: theme.colors.textSecondary,
  },
  warning: {
    color: "#B45309",
  },
  actions: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
  },
  cancelText: {
    color: theme.colors.textSecondary,
  },
});
