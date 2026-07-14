import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

type EditContentCaptionModalProps = {
  visible: boolean;
  initialCaption: string;
  maxLength: number;
  isSubmitting?: boolean;
  onClose: () => void;
  onSave: (caption: string) => void;
};

export function EditContentCaptionModal({
  visible,
  initialCaption,
  maxLength,
  isSubmitting = false,
  onClose,
  onSave,
}: EditContentCaptionModalProps) {
  const [draftCaption, setDraftCaption] = useState(initialCaption);

  useEffect(() => {
    if (visible) {
      setDraftCaption(initialCaption);
    }
  }, [initialCaption, visible]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Pressable onPress={onClose} style={styles.dismissArea} />
        <View style={styles.sheet}>
          <AppText style={styles.title} variant="sectionTitle">
            Gönderiyi düzenle
          </AppText>
          <TextInput
            editable={!isSubmitting}
            maxLength={maxLength}
            multiline
            onChangeText={setDraftCaption}
            placeholder="Açıklama yaz..."
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            value={draftCaption}
          />
          <AppText style={styles.counter} variant="caption">
            {draftCaption.length}/{maxLength}
          </AppText>
          <View style={styles.actions}>
            <Pressable disabled={isSubmitting} onPress={onClose} style={styles.secondaryButton}>
              <AppText style={styles.secondaryButtonText} variant="label">
                Vazgeç
              </AppText>
            </Pressable>
            <Pressable
              disabled={isSubmitting}
              onPress={() => onSave(draftCaption.trim())}
              style={styles.primaryButton}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <AppText style={styles.primaryButtonText} variant="label">
                  Kaydet
                </AppText>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  dismissArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    minHeight: 120,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    textAlignVertical: "top",
  },
  counter: {
    alignSelf: "flex-end",
    color: theme.colors.muted,
  },
  actions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  primaryButtonText: {
    color: "#FFFFFF",
  },
});
