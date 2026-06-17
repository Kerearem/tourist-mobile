import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { theme } from "../../constants/theme";
import { AppText } from "./AppText";

type LoaderProps = {
  label?: string;
};

export function Loader({ label }: LoaderProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={theme.colors.primary} size="small" />
      {label ? (
        <AppText style={styles.label} variant="bodyMuted">
          {label}
        </AppText>
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
  label: {
    textAlign: "center",
  },
});
