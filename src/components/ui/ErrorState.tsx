import React from "react";
import { StyleSheet, View } from "react-native";

import { theme } from "../../constants/theme";
import { AppText } from "./AppText";

type ErrorStateProps = {
  title?: string;
  subtitle?: string;
};

export function ErrorState({ title = "Something went wrong", subtitle }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <AppText style={styles.title}>{title}</AppText>
      {subtitle ? <AppText muted>{subtitle}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: theme.colors.danger,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
});
