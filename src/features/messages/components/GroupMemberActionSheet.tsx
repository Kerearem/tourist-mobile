import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { GroupMemberActionFlags } from "../utils/groupModeration";

type Props = {
  visible: boolean;
  memberName: string;
  flags: GroupMemberActionFlags;
  onClose: () => void;
  onProfile: () => void;
  onReport: () => void;
  onKick: () => void;
  onBan: () => void;
  onMute: () => void;
  onUnmute: () => void;
};

export function GroupMemberActionSheet({
  visible,
  memberName,
  flags,
  onClose,
  onProfile,
  onReport,
  onKick,
  onBan,
  onMute,
  onUnmute,
}: Props) {
  if (!visible || !flags.canOpenSheet) {
    return null;
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <View style={styles.wrap}>
          <Pressable style={styles.sheet}>
            <AppText numberOfLines={1} style={styles.title} variant="caption">
              {memberName}
            </AppText>

            {flags.showProfile ? (
              <Pressable
                onPress={onProfile}
                style={({ pressed }) => [styles.optionRow, pressed && styles.optionPressed]}
              >
                <Ionicons color={theme.colors.textPrimary} name="person-outline" size={22} />
                <AppText style={styles.optionText} variant="body">
                  Profili Gör
                </AppText>
              </Pressable>
            ) : null}

            {flags.showMute ? (
              <Pressable
                onPress={onMute}
                style={({ pressed }) => [styles.optionRow, pressed && styles.optionPressed]}
              >
                <Ionicons color={theme.colors.textPrimary} name="volume-mute-outline" size={22} />
                <AppText style={styles.optionText} variant="body">
                  Sustur
                </AppText>
              </Pressable>
            ) : null}

            {flags.showUnmute ? (
              <Pressable
                onPress={onUnmute}
                style={({ pressed }) => [styles.optionRow, pressed && styles.optionPressed]}
              >
                <Ionicons color={theme.colors.textPrimary} name="volume-high-outline" size={22} />
                <AppText style={styles.optionText} variant="body">
                  Susturmayı kaldır
                </AppText>
              </Pressable>
            ) : null}

            {flags.showKick ? (
              <Pressable
                onPress={onKick}
                style={({ pressed }) => [styles.optionRow, pressed && styles.optionPressed]}
              >
                <Ionicons color="#B45309" name="exit-outline" size={22} />
                <AppText style={[styles.optionText, styles.warnText]} variant="body">
                  Çıkar
                </AppText>
              </Pressable>
            ) : null}

            {flags.showBan ? (
              <Pressable
                onPress={onBan}
                style={({ pressed }) => [styles.optionRow, pressed && styles.optionPressed]}
              >
                <Ionicons color={theme.colors.danger} name="ban-outline" size={22} />
                <AppText style={[styles.optionText, styles.dangerText]} variant="body">
                  Banla
                </AppText>
              </Pressable>
            ) : null}

            {flags.showReport ? (
              <Pressable
                onPress={onReport}
                style={({ pressed }) => [styles.optionRow, pressed && styles.optionPressed]}
              >
                <Ionicons color={theme.colors.danger} name="flag-outline" size={22} />
                <AppText style={[styles.optionText, styles.dangerText]} variant="body">
                  Şikayet Et
                </AppText>
              </Pressable>
            ) : null}
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
  },
  title: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  optionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.md,
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
  },
  warnText: {
    color: "#B45309",
  },
  dangerText: {
    color: theme.colors.danger,
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
