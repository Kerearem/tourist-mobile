import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { theme } from "../../constants/theme";
import { AppText } from "./AppText";

type ListItemProps = {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
};

export function ListItem({ title, subtitle, left, right, onPress }: ListItemProps) {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      {left ? <View style={styles.left}>{left}</View> : null}
      <View style={styles.center}>
        <AppText style={styles.title} variant="label">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ? <View>{right}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 52,
    paddingVertical: theme.spacing.sm,
  },
  left: {
    marginRight: theme.spacing.md,
  },
  center: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
});
