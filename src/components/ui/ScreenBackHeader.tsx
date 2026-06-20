import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "./AppText";
import { theme } from "../../constants/theme";

type ScreenBackHeaderProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
};

export function ScreenBackHeader({ title, subtitle, onBack }: ScreenBackHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={26} />
        </Pressable>
        <AppText style={styles.topTitle} variant="label">
          {title}
        </AppText>
        <View style={styles.topSpacer} />
      </View>
      {subtitle ? (
        <AppText style={styles.subtitle} variant="bodyMuted">
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  topTitle: {
    fontSize: 18,
  },
  topSpacer: {
    width: 26,
  },
  subtitle: {
    paddingHorizontal: theme.spacing.xs,
  },
});
