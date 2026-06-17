import React from "react";
import { StyleSheet, View } from "react-native";

import { theme } from "../../constants/theme";
import { AppButton } from "./AppButton";
import { AppText } from "./AppText";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  subtitle?: string;
};

export function EmptyState({ title, description, actionLabel, onActionPress, subtitle }: EmptyStateProps) {
  const helperText = description || subtitle;

  return (
    <View style={styles.container}>
      <AppText style={styles.title} variant="sectionTitle">
        {title}
      </AppText>
      {helperText ? (
        <AppText style={styles.description} variant="bodyMuted">
          {helperText}
        </AppText>
      ) : null}
      {actionLabel && onActionPress ? (
        <AppButton containerStyle={styles.actionButton} label={actionLabel} onPress={onActionPress} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: theme.spacing.sm,
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
  },
  description: {
    textAlign: "center",
  },
  actionButton: {
    marginTop: theme.spacing.sm,
  },
});
