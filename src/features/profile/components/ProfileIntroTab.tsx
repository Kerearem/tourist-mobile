import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

type ProfileIntroTabProps = {
  canCreateReel?: boolean;
  onCreateReel?: () => void;
};

export function ProfileIntroTab({ canCreateReel = false, onCreateReel }: ProfileIntroTabProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons color={theme.colors.muted} name="film-outline" size={40} />
      </View>
      <AppText style={styles.title} variant="label">
        Henüz tanıtım içeriği yok
      </AppText>
      <AppText style={styles.subtitle} variant="bodyMuted">
        Tanıtım videoların ve öne çıkan içeriklerin burada görünecek.
      </AppText>
      {canCreateReel ? (
        <AppButton
          containerStyle={styles.createButton}
          label="Tanıtım Ekle"
          onPress={onCreateReel}
          variant="secondary"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: theme.spacing.sm,
    justifyContent: "center",
    minHeight: 220,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    height: 72,
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
    width: 72,
  },
  title: {
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  createButton: {
    marginTop: theme.spacing.md,
    minWidth: 180,
  },
});
