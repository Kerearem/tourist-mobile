import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { theme } from "../../../constants/theme";
import { getHelpCategoryLabel, HELP_STATUS_LABELS } from "../constants/helpCategories";
import type { HelpRequest } from "../types";

type HelpRequestCardProps = {
  request: HelpRequest;
  onOpen: () => void;
  onHelp: () => void;
  isOwnRequest?: boolean;
  isResponding?: boolean;
};

const relativeTimeTr = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) {
    return `${diffMin} dk önce`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours} sa önce`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} gün önce`;
};

export function HelpRequestCard({ request, onOpen, onHelp, isOwnRequest = false, isResponding = false }: HelpRequestCardProps) {
  const categoryLabel = getHelpCategoryLabel(request.category);
  const statusLabel = HELP_STATUS_LABELS[request.status];
  const timeLabel = relativeTimeTr(request.createdAt);
  const canRespond = !isOwnRequest && !request.viewerState.hasResponded && request.status !== "resolved";

  return (
    <Pressable onPress={onOpen}>
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.categoryBadge}>
            <AppText style={styles.categoryText} variant="caption">
              {categoryLabel.toUpperCase()}
            </AppText>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.statusPill}>
              <AppText style={styles.statusText} variant="caption">
                {statusLabel}
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

          {canRespond ? (
            <Pressable
              disabled={isResponding}
              onPress={(event) => {
                event.stopPropagation?.();
                onHelp();
              }}
              style={[styles.helpButton, isResponding && styles.helpButtonDisabled]}
            >
              <Ionicons color="#059669" name="hand-left-outline" size={18} />
              <AppText style={styles.helpButtonText} variant="label">
                {isResponding ? "Açılıyor..." : "Yardım edebilirim"}
              </AppText>
            </Pressable>
          ) : request.viewerState.hasResponded ? (
            <AppText style={styles.respondedText} variant="caption">
              Yanıtladın
            </AppText>
          ) : null}
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
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryBadge: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  categoryText: {
    color: "#047857",
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  metaRow: {
    alignItems: "flex-end",
    gap: 4,
  },
  statusPill: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
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
    lineHeight: 24,
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
    flex: 1,
    gap: theme.spacing.sm,
  },
  locationText: {
    color: "#6B7280",
    flexShrink: 1,
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
  helpButtonDisabled: {
    opacity: 0.6,
  },
  helpButtonText: {
    color: "#059669",
    fontSize: 15,
  },
  respondedText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
});
