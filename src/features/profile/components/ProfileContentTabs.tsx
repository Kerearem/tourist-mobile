import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

type ProfileContentTab = "reels" | "events";

const tabs: Array<{ key: ProfileContentTab; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "reels", icon: "play-outline" },
  { key: "events", icon: "calendar-outline" },
];

const reelItems = [
  { id: "reel_1", count: "1.2k", color: "#92400E", mediaType: "video" as const },
  { id: "reel_2", count: "856", color: "#0E7490", mediaType: "photo" as const },
  { id: "reel_3", count: "2.1k", color: "#374151", mediaType: "video" as const },
  { id: "reel_4", count: "489", color: "#475569", mediaType: "photo" as const },
  { id: "reel_5", count: "965", color: "#0369A1", mediaType: "video" as const },
  { id: "reel_6", count: "322", color: "#7C3AED", mediaType: "photo" as const },
];
const eventItems = [
  { month: "OCT", day: "24", title: "International Food Festival", city: "Berlin", isHost: true },
  { month: "OCT", day: "29", title: "Startup Networking Night", city: "Berlin" },
  { month: "NOV", day: "1", title: "Sunday Park Picnic", city: "Berlin" },
];

function ReelsTab({ tileSize, tileHeight }: { tileSize: number; tileHeight: number }) {
  return (
    <View style={styles.reelsGrid}>
      {reelItems.map((item) => (
        <View key={item.id} style={[styles.reelTile, { backgroundColor: item.color, height: tileHeight, width: tileSize }]}>
          <View style={styles.reelCount}>
            <Ionicons color="#FFFFFF" name={item.mediaType === "photo" ? "image-outline" : "play"} size={13} />
            <AppText style={styles.reelCountText} variant="caption">
              {item.count}
            </AppText>
          </View>
          <AppText style={styles.reelTypeText} variant="caption">
            {item.mediaType === "photo" ? "Foto" : "Video"}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function EventsTab() {
  return (
    <View style={styles.eventsList}>
      {eventItems.map((event) => (
        <View key={`${event.month}_${event.day}`} style={styles.eventCard}>
          <View style={styles.dateBox}>
            <AppText style={styles.dateMonth} variant="caption">
              {event.month}
            </AppText>
            <AppText style={styles.dateDay} variant="sectionTitle">
              {event.day}
            </AppText>
          </View>
          <View style={styles.eventText}>
            <AppText numberOfLines={1} style={styles.eventTitle} variant="label">
              {event.title}
            </AppText>
            <AppText variant="bodyMuted">{event.city}</AppText>
          </View>
          {event.isHost ? (
            <View style={styles.hostBadge}>
              <AppText style={styles.hostText} variant="caption">
                HOST
              </AppText>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function ProfileContentTabs() {
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<ProfileContentTab>("reels");
  const fullWidth = width;
  const tileSize = useMemo(() => Math.floor(fullWidth / 3), [fullWidth]);
  const reelsHeight = useMemo(() => Math.floor(tileSize / 0.58), [tileSize]);
  const eventsHeight = 3 * 92 + 2 * theme.spacing.md + 2 * theme.spacing.lg;
  const contentMinHeight = Math.max(reelsHeight * 2, eventsHeight);

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={styles.tabButton}>
              <Ionicons color={isActive ? theme.colors.textPrimary : theme.colors.muted} name={tab.icon} size={30} />
              {isActive ? <View style={styles.activeIndicator} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.contentArea, { minHeight: contentMinHeight }]}>
        <View style={{ display: activeTab === "reels" ? "flex" : "none" }}>
          <ReelsTab tileHeight={reelsHeight} tileSize={tileSize} />
        </View>
        <View style={{ display: activeTab === "events" ? "flex" : "none" }}>
          <EventsTab />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    marginHorizontal: -theme.spacing.lg,
  },
  contentArea: {
    width: "100%",
  },
  tabRow: {
    flexDirection: "row",
    minHeight: 72,
  },
  tabButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  activeIndicator: {
    backgroundColor: theme.colors.textPrimary,
    bottom: 0,
    height: 3,
    position: "absolute",
    width: "100%",
  },
  reelsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  reelTile: {
    borderColor: "#FFFFFF",
    borderWidth: 1,
    justifyContent: "flex-end",
    padding: theme.spacing.sm,
  },
  reelCount: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  reelCountText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  reelTypeText: {
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: theme.spacing.xs,
  },
  eventsList: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  eventCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    minHeight: 92,
    padding: theme.spacing.md,
  },
  dateBox: {
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: theme.radius.md,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  dateMonth: {
    color: "#5B3CF6",
    fontWeight: "800",
  },
  dateDay: {
    color: "#5B3CF6",
  },
  eventText: {
    flex: 1,
  },
  eventTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
  },
  hostBadge: {
    backgroundColor: "#FAE8FF",
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  hostText: {
    color: "#86198F",
    fontWeight: "800",
  },
});
