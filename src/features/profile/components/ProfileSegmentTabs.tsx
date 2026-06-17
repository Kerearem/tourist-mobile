import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

export type ProfileSegmentKey = "posts" | "help" | "events";

type ProfileSegmentTabsProps = {
  value: ProfileSegmentKey;
  onChange: (next: ProfileSegmentKey) => void;
};

const segments: Array<{ key: ProfileSegmentKey; label: string }> = [
  { key: "posts", label: "Posts" },
  { key: "help", label: "Help Activity" },
  { key: "events", label: "Events" },
];

export function ProfileSegmentTabs({ value, onChange }: ProfileSegmentTabsProps) {
  return (
    <View style={styles.row}>
      {segments.map((segment) => {
        const active = segment.key === value;
        return (
          <Pressable
            key={segment.key}
            onPress={() => onChange(segment.key)}
            style={[styles.tab, active && styles.activeTab]}
          >
            <AppText style={active ? styles.activeText : styles.text} variant="label">
              {segment.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  tab: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.sm,
  },
  activeTab: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary,
  },
  text: {
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  activeText: {
    color: theme.colors.primary,
    textAlign: "center",
  },
});
