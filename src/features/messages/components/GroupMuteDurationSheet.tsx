import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { MuteDurationMinutes } from "../../events/services/eventGroup.service";
import { MUTE_DURATION_OPTIONS } from "../utils/groupModeration";

type Props = {
  visible: boolean;
  memberName: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSelect: (durationMinutes: MuteDurationMinutes) => void;
};

export function GroupMuteDurationSheet({
  visible,
  memberName,
  isSubmitting = false,
  onClose,
  onSelect,
}: Props) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <View style={styles.wrap}>
          <Pressable style={styles.sheet}>
            <AppText style={styles.title} variant="label">
              Susturma süresi
            </AppText>
            <AppText numberOfLines={1} style={styles.subtitle} variant="caption">
              {memberName}
            </AppText>
            {MUTE_DURATION_OPTIONS.map((option) => (
              <Pressable
                disabled={isSubmitting}
                key={option.minutes}
                onPress={() => onSelect(option.minutes)}
                style={({ pressed }) => [styles.optionRow, pressed && styles.optionPressed]}
              >
                <AppText style={styles.optionText} variant="body">
                  {option.label}
                </AppText>
              </Pressable>
            ))}
          </Pressable>
          <Pressable disabled={isSubmitting} onPress={onClose} style={styles.cancelButton}>
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
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  wrap: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.lg,
    overflow: "hidden",
    paddingTop: theme.spacing.md,
  },
  title: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    paddingHorizontal: theme.spacing.lg,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 4,
  },
  optionRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  optionPressed: {
    backgroundColor: "#F8FAFC",
  },
  optionText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
  },
  cancelText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
});
