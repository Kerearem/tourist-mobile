import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

type EventCategoryTabsProps = {
  activeTab: string;
  onChange: (tab: string) => void;
};

const tabs: Array<{ key: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "All", label: "Tümü", icon: "apps-outline" },
  { key: "Free", label: "Ücretsiz", icon: "cash-outline" },
  { key: "Paid", label: "Ücretli", icon: "card-outline" },
  { key: "Social", label: "Sosyal", icon: "people-outline" },
  { key: "Networking", label: "Networking", icon: "briefcase-outline" },
  { key: "Outdoors", label: "Açık Hava", icon: "leaf-outline" },
];

export function EventCategoryTabs({ activeTab, onChange }: EventCategoryTabsProps) {
  return (
    <ScrollView contentContainerStyle={styles.row} horizontal showsHorizontalScrollIndicator={false}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={styles.item}>
            <Ionicons color={active ? theme.colors.textPrimary : theme.colors.muted} name={tab.icon} size={22} />
            <AppText style={[styles.label, active && styles.activeLabel]} variant="caption">
              {tab.label}
            </AppText>
            <View style={[styles.underline, active && styles.activeUnderline]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
  },
  item: {
    alignItems: "center",
    gap: theme.spacing.xs,
    minWidth: 64,
  },
  label: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },
  activeLabel: {
    color: theme.colors.textPrimary,
  },
  underline: {
    backgroundColor: "transparent",
    borderRadius: 2,
    height: 2,
    marginTop: theme.spacing.xs,
    width: "100%",
  },
  activeUnderline: {
    backgroundColor: theme.colors.textPrimary,
  },
});
