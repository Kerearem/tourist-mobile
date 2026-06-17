import React from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

type EventFilterChipsProps = {
  activeChip: string;
  onChange: (chip: string) => void;
};

const chips = ["All", "Free", "Paid", "Social", "Networking", "Outdoors"];

export function EventFilterChips({ activeChip, onChange }: EventFilterChipsProps) {
  return (
    <ScrollView contentContainerStyle={styles.row} horizontal showsHorizontalScrollIndicator={false}>
      {chips.map((chip) => {
        const active = chip === activeChip;
        return (
          <Pressable key={chip} onPress={() => onChange(chip)} style={[styles.chip, active && styles.activeChip]}>
            <AppText style={[styles.label, active && styles.activeLabel]} variant="label">
              {chip}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  chip: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EDF0F4",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  activeChip: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  label: {
    color: "#4B5563",
    fontSize: 14,
  },
  activeLabel: {
    color: "#FFFFFF",
  },
});
