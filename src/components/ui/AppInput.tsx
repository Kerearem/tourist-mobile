import React from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";

import { theme } from "../../constants/theme";

export function AppInput(props: TextInputProps) {
  return <TextInput placeholderTextColor={theme.colors.textSecondary} style={styles.input} {...props} />;
}

const styles = StyleSheet.create({
  input: {
    borderColor: theme.colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
