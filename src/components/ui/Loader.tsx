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
      <ActivityIndicator color={theme.colors.primary} />
      {label ? <AppText muted style={styles.label}>{label}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginTop: 8,
  },
});
