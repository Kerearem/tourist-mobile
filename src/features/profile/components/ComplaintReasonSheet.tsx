import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import {
  COMPLAINT_REASON_OPTIONS,
  type ComplaintReason,
} from "../services/complaints.service";

type ComplaintReasonSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: ComplaintReason) => Promise<void>;
  isSubmitting?: boolean;
  title?: string;
};

export function ComplaintReasonSheet({
  visible,
  onClose,
  onSubmit,
  isSubmitting = false,
  title = "Şikayet sebebi",
}: ComplaintReasonSheetProps) {
  const [selectedReason, setSelectedReason] = useState<ComplaintReason | null>(null);

  useEffect(() => {
    if (!visible) {
      setSelectedReason(null);
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!selectedReason || isSubmitting) {
      return;
    }
    await onSubmit(selectedReason);
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <View style={styles.wrap}>
          <Pressable style={styles.sheet}>
            <AppText style={styles.title} variant="label">
              {title}
            </AppText>
            {COMPLAINT_REASON_OPTIONS.map((item) => (
              <Pressable
                key={item.value}
                onPress={() => setSelectedReason(item.value)}
                style={styles.optionRow}
              >
                <AppText
                  style={[styles.optionText, selectedReason === item.value && styles.optionSelected]}
                  variant="body"
                >
                  {item.label}
                </AppText>
              </Pressable>
            ))}
            <Pressable
              disabled={!selectedReason || isSubmitting}
              onPress={() => void handleSubmit()}
              style={[styles.submitButton, (!selectedReason || isSubmitting) && styles.submitButtonDisabled]}
            >
              <AppText style={styles.submitButtonText} variant="label">
                {isSubmitting ? "Gönderiliyor..." : "Şikayeti Gönder"}
              </AppText>
            </Pressable>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <AppText style={styles.cancelText} variant="body">
              İptal
            </AppText>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
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
  title: {
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    textAlign: "center",
  },
  optionRow: {
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  optionText: {
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  optionSelected: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: theme.spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    color: "#FFFFFF",
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
