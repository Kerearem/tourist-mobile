import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import {
  GROUP_MODERATION_REASON_MIN_LENGTH,
  isValidModerationReason,
} from "../utils/groupModeration";

type Mode = "kick" | "ban";

type Props = {
  visible: boolean;
  mode: Mode;
  memberName: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
};

export function GroupModerationReasonModal({
  visible,
  mode,
  memberName,
  isSubmitting = false,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!visible) {
      setReason("");
    }
  }, [visible]);

  const trimmed = reason.trim();
  const canSubmit = isValidModerationReason(trimmed) && !isSubmitting;
  const title = mode === "ban" ? "Üyeyi banla" : "Üyeyi çıkar";
  const confirmLabel = mode === "ban" ? "Banla" : "Çıkar";

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable onPress={onClose} style={styles.backdrop} />
        <View style={styles.card}>
          <AppText style={styles.title} variant="label">
            {title}
          </AppText>
          <AppText style={styles.subtitle} variant="caption">
            {memberName}
          </AppText>

          {mode === "ban" ? (
            <AppText style={styles.warning} variant="caption">
              Bu kişi gelecekteki etkinliklerine de katılamayacak.
            </AppText>
          ) : null}

          <AppText style={styles.info} variant="caption">
            Token iadesi otomatik yapılır.
          </AppText>

          <TextInput
            autoFocus
            editable={!isSubmitting}
            multiline
            onChangeText={setReason}
            placeholder="Sebep yaz (en az 3 karakter)"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            value={reason}
          />
          <AppText style={styles.hint} variant="caption">
            En az {GROUP_MODERATION_REASON_MIN_LENGTH} karakter
          </AppText>

          <View style={styles.actions}>
            <Pressable disabled={isSubmitting} onPress={onClose} style={styles.cancelButton}>
              <AppText style={styles.cancelText} variant="label">
                Vazgeç
              </AppText>
            </Pressable>
            <Pressable
              disabled={!canSubmit}
              onPress={() => void onConfirm(trimmed)}
              style={[styles.confirmButton, !canSubmit && styles.confirmDisabled]}
            >
              <AppText style={styles.confirmText} variant="label">
                {isSubmitting ? "..." : confirmLabel}
              </AppText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.lg,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  warning: {
    backgroundColor: "#FEF3C7",
    borderRadius: theme.radius.md,
    color: "#92400E",
    fontWeight: "600",
    overflow: "hidden",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  info: {
    color: theme.colors.textSecondary,
  },
  input: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    minHeight: 88,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    textAlignVertical: "top",
  },
  hint: {
    color: theme.colors.muted,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: theme.radius.md,
    flex: 1,
    paddingVertical: theme.spacing.md,
  },
  cancelText: {
    color: theme.colors.textPrimary,
  },
  confirmButton: {
    alignItems: "center",
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.md,
    flex: 1,
    paddingVertical: theme.spacing.md,
  },
  confirmDisabled: {
    opacity: 0.45,
  },
  confirmText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
