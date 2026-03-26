import React from "react";
import { StyleSheet, Text, type TextProps } from "react-native";

import { theme } from "../../constants/theme";

type AppTextProps = TextProps & {
  muted?: boolean;
};

export function AppText({ style, muted, ...props }: AppTextProps) {
  return <Text style={[styles.base, muted && styles.muted, style]} {...props} />;
}

const styles = StyleSheet.create({
  base: {
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  muted: {
    color: theme.colors.textSecondary,
  },
});
