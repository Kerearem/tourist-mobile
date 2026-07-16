import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { PersonalEventsSegment } from "../utils/eventsTabUx";

type EventsTabSegmentControlProps<K extends string> = {
  activeSection: K;
  onChange: (section: K) => void;
  segments: ReadonlyArray<PersonalEventsSegment<K>>;
};

export function EventsTabSegmentControl<K extends string>({
  activeSection,
  onChange,
  segments,
}: EventsTabSegmentControlProps<K>) {
  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {segments.map((segment) => {
        const isActive = segment.key === activeSection;
        return (
          <Pressable
            key={segment.key}
            onPress={() => onChange(segment.key)}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <AppText style={isActive ? styles.chipTextActive : styles.chipText} variant="label">
              {segment.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  chip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  chipActive: {
    backgroundColor: "#111827",
  },
  chipText: {
    color: theme.colors.textPrimary,
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
});
