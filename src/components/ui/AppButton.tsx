import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { theme } from "../../constants/theme";
import { AppText } from "./AppText";

type AppButtonVariant = "primary" | "secondary" | "danger";

type AppButtonProps = PressableProps & {
  label: string;
  containerStyle?: StyleProp<ViewStyle>;
  variant?: AppButtonVariant;
  loading?: boolean;
};

export function AppButton({ label, containerStyle, variant = "primary", loading = false, disabled, ...props }: AppButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      style={[styles.button, variantStyles[variant], isDisabled && styles.disabled, containerStyle]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? theme.colors.textPrimary : "#FFFFFF"} />
      ) : (
        <AppText style={[styles.label, variant === "secondary" && styles.secondaryLabel]} variant="label">
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const variantStyles: Record<AppButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  danger: {
    backgroundColor: theme.colors.danger,
  },
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: theme.radius.md,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  secondaryLabel: {
    color: theme.colors.textPrimary,
  },
  disabled: {
    opacity: 0.6,
  },
});
