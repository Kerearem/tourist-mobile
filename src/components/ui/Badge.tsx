import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { theme } from "../../constants/theme";
import { AppText } from "./AppText";

type BadgeProps = {
  label: string;
  style?: StyleProp<ViewStyle>;
};

export function Badge({ label, style }: BadgeProps) {
  return (
    <View style={[styles.badge, style]}>
      <AppText style={styles.text} variant="caption">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  text: {
    color: theme.colors.textSecondary,
  },
});
