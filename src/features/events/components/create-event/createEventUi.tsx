import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { AppText } from "../../../../components/ui/AppText";
import { theme } from "../../../../constants/theme";

export function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <AppText style={styles.fieldError} variant="caption">
      {message}
    </AppText>
  );
}

export const FIELD_RADIUS = 14;
export const SELECTED_BORDER = "#7C3AED";
export const SELECTED_BG = "#F5F3FF";

export const inputFieldStyle = { borderRadius: FIELD_RADIUS };

export function errorBorder(hasError: boolean): ViewStyle | null {
  return hasError ? styles.inputErrorBorder : null;
}

const styles = StyleSheet.create({
  fieldError: {
    color: theme.colors.danger,
  },
  inputErrorBorder: {
    borderColor: theme.colors.danger,
  },
});

export function StepSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.section}>
      {title ? (
        <AppText style={sectionStyles.title} variant="sectionTitle">
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  section: {
    gap: theme.spacing.md,
  },
  title: {
    color: theme.colors.textPrimary,
  },
});
