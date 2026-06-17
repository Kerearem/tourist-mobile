import React, { useState } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { theme } from "../../constants/theme";
import { AppText } from "./AppText";

type AppInputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function AppInput({ label, error, style, onFocus, onBlur, ...props }: AppInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <TextInput
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        placeholderTextColor={theme.colors.muted}
        style={[styles.input, isFocused && styles.focused, !!error && styles.errorBorder, style]}
        {...props}
      />
      {error ? (
        <AppText style={styles.errorText} variant="caption">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.xs,
  },
  input: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: theme.colors.textPrimary,
    ...theme.typography.body,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  focused: {
    borderColor: theme.colors.primary,
  },
  errorBorder: {
    borderColor: theme.colors.danger,
  },
  errorText: {
    color: theme.colors.danger,
  },
});
