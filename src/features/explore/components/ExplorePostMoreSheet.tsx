import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

type ExplorePostMoreSheetProps = {
  visible: boolean;
  onClose: () => void;
  onReportPress: () => void;
};

export function ExplorePostMoreSheet({ visible, onClose, onReportPress }: ExplorePostMoreSheetProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <View style={styles.wrap}>
          <Pressable style={styles.sheet}>
            <Pressable onPress={onReportPress} style={styles.reportRow}>
              <AppText style={styles.reportText} variant="body">
                İçeriği şikâyet et
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
  reportRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  reportText: {
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
