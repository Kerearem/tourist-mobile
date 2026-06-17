import React from "react";
import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";

import { theme } from "../../constants/theme";

type AppTextVariant = "hero" | "title" | "sectionTitle" | "body" | "bodyMuted" | "caption" | "label";

type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  muted?: boolean;
};

const variantStyles: Record<AppTextVariant, TextStyle> = {
  hero: theme.typography.hero,
  title: theme.typography.title,
  sectionTitle: theme.typography.sectionTitle,
  body: theme.typography.body,
  bodyMuted: {
    ...theme.typography.bodyMuted,
    color: theme.colors.textSecondary,
  },
  caption: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  label: theme.typography.label,
};

export function AppText({ style, muted, variant = "body", ...props }: AppTextProps) {
  return <Text style={[styles.base, variantStyles[variant], muted && styles.muted, style]} {...props} />;
}

const styles = StyleSheet.create({
  base: {
    color: theme.colors.textPrimary,
  },
  muted: {
    color: theme.colors.textSecondary,
  },
});
