import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { theme } from "../../../constants/theme";
import type { HelpRequest } from "../types";

type HelpRequestCardProps = {
  request: HelpRequest;
  onOpen: () => void;
  onHelp: () => void;
};

const categoryTone = (category: string) => {
  const normalized = category.trim().toLowerCase();
  if (normalized === "home") {
    return { bg: "#FFF7ED", text: "#C2410C" };
  }
  if (normalized === "visa") {
    return { bg: "#F5F3FF", text: "#7C3AED" };
  }
  if (normalized === "health") {
    return { bg: "#FEF2F2", text: "#B91C1C" };
  }
  return { bg: "#F3F4F6", text: "#374151" };
};

const relativeTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) {
    return `${diffMin} min ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours} hours ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
};

export function HelpRequestCard({ request, onOpen, onHelp }: HelpRequestCardProps) {
  const categoryLabel = request.category?.trim() || "General";
  const tone = categoryTone(categoryLabel);
  const timeLabel = relativeTime(request.createdAt);

  return (
    <Pressable onPress={onOpen}>
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <View style={[styles.categoryBadge, { backgroundColor: tone.bg }]}>
            <AppText style={[styles.categoryText, { color: tone.text }]} variant="caption">
              {categoryLabel.toUpperCase()}
            </AppText>
          </View>
          {timeLabel ? (
            <View style={styles.timeRow}>
              <Ionicons color={theme.colors.textSecondary} name="time-outline" size={15} />
              <AppText style={styles.timeText} variant="caption">
                {timeLabel}
              </AppText>
            </View>
          ) : null}
        </View>

        <AppText style={styles.title} variant="sectionTitle">
          {request.title}
        </AppText>
        <AppText numberOfLines={2} style={styles.preview} variant="bodyMuted">
          {request.description}
        </AppText>

        <View style={styles.divider} />

        <View style={styles.bottomRow}>
          <View style={styles.locationRow}>
            <Ionicons color={theme.colors.textSecondary} name="location-outline" size={16} />
            <AppText style={styles.locationText} variant="bodyMuted">
              {request.city}
              {request.countryCode ? `, ${request.countryCode}` : ""}
            </AppText>
          </View>

          <Pressable onPress={onHelp} style={styles.helpButton}>
            <Ionicons color="#059669" name="hand-left-outline" size={18} />
            <AppText style={styles.helpButtonText} variant="label">
              Yardım edebilirim
            </AppText>
          </Pressable>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryBadge: {
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  categoryText: {
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  timeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  timeText: {
    color: theme.colors.textSecondary,
  },
  title: {
    color: theme.colors.textPrimary,
    lineHeight: 34,
  },
  preview: {
    color: "#4B5563",
    lineHeight: 35,
  },
  divider: {
    backgroundColor: "#EEF0F3",
    height: 1,
  },
  bottomRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  locationText: {
    color: "#6B7280",
  },
  helpButton: {
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  helpButtonText: {
    color: "#059669",
    fontSize: 16,
  },
});
