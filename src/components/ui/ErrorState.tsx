import React from "react";
import { StyleSheet, View } from "react-native";

import { theme } from "../../constants/theme";
import { AppButton } from "./AppButton";
import { AppText } from "./AppText";

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  subtitle?: string;
};

export function ErrorState({ title = "Something went wrong", message, onRetry, subtitle }: ErrorStateProps) {
  const helperText = message || subtitle;

  return (
    <View style={styles.container}>
      <AppText style={styles.title} variant="sectionTitle">
        {title}
      </AppText>
      {helperText ? (
        <AppText style={styles.message} variant="bodyMuted">
          {helperText}
        </AppText>
      ) : null}
      {onRetry ? <AppButton label="Retry" onPress={onRetry} variant="secondary" /> : null}
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
    color: theme.colors.danger,
    textAlign: "center",
  },
  message: {
    textAlign: "center",
  },
});
