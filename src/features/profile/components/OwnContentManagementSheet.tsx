import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

type OwnContentManagementSheetProps = {
  visible: boolean;
  isPinned?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canPin?: boolean;
  onClose: () => void;
  onEditPress?: () => void;
  onDeletePress?: () => void;
  onPinPress?: () => void;
  onUnpinPress?: () => void;
};

export function OwnContentManagementSheet({
  visible,
  isPinned = false,
  canEdit = true,
  canDelete = true,
  canPin = true,
  onClose,
  onEditPress,
  onDeletePress,
  onPinPress,
  onUnpinPress,
}: OwnContentManagementSheetProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <View style={styles.wrap}>
          <Pressable style={styles.sheet}>
            {canEdit ? (
              <Pressable onPress={onEditPress} style={styles.row}>
                <AppText style={styles.rowText} variant="body">
                  Gönderiyi düzenle
                </AppText>
              </Pressable>
            ) : null}
            {canPin ? (
              <Pressable
                onPress={isPinned ? onUnpinPress : onPinPress}
                style={[styles.row, canEdit ? styles.rowBorder : null]}
              >
                <AppText style={styles.rowText} variant="body">
                  {isPinned ? "Sabitlemeyi kaldır" : "Sabitle"}
                </AppText>
              </Pressable>
            ) : null}
            {canDelete ? (
              <Pressable
                onPress={onDeletePress}
                style={[styles.row, canEdit || canPin ? styles.rowBorder : null]}
              >
                <AppText style={styles.deleteText} variant="body">
                  Sil
                </AppText>
              </Pressable>
            ) : null}
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <AppText style={styles.cancelText} variant="body">
              Vazgeç
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
  row: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  rowBorder: {
    borderTopColor: theme.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    textAlign: "center",
  },
  deleteText: {
    color: theme.colors.danger,
    fontWeight: "600",
    textAlign: "center",
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
