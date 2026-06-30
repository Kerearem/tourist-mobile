import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import { ProfileSnapsGrid } from "../../snaps/components/ProfileSnapsGrid";
import { ProfileIntroTab } from "./ProfileIntroTab";
import { ProfileOrganizerEventsTab } from "./ProfileOrganizerEventsTab";

type MemberTab = "snaps" | "events";
type OrganizerTab = "intro" | "organizerEvents";

type ProfileContentTabsProps = {
  userId: string;
  refreshToken?: number;
  isOrganizer?: boolean;
  isOwnProfile?: boolean;
  onActiveEventPress?: (eventId: string) => void;
  onPastEventPress?: (eventId: string) => void;
};

const memberTabs: Array<{ key: MemberTab; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { key: "snaps", icon: "camera-outline", label: "Snap'ler" },
  { key: "events", icon: "calendar-outline", label: "Etkinlikler" },
];

const organizerTabs: Array<{ key: OrganizerTab; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { key: "intro", icon: "film-outline", label: "Tanıtım" },
  { key: "organizerEvents", icon: "calendar-outline", label: "Etkinlikler" },
];

const memberEventItems = [
  { month: "OCT", day: "24", title: "International Food Festival", city: "Berlin", isHost: true },
  { month: "OCT", day: "29", title: "Startup Networking Night", city: "Berlin" },
  { month: "NOV", day: "1", title: "Sunday Park Picnic", city: "Berlin" },
];

function MemberEventsTab() {
  return (
    <View style={styles.eventsList}>
      {memberEventItems.map((event) => (
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

export function ProfileContentTabs({
  userId,
  refreshToken,
  isOrganizer = false,
  isOwnProfile = true,
  onActiveEventPress,
  onPastEventPress,
}: ProfileContentTabsProps) {
  const [memberTab, setMemberTab] = useState<MemberTab>("snaps");
  const [organizerTab, setOrganizerTab] = useState<OrganizerTab>("intro");

  useEffect(() => {
    if (isOrganizer) {
      setOrganizerTab("intro");
    } else {
      setMemberTab("snaps");
    }
  }, [isOrganizer]);

  const contentMinHeight = useMemo(() => {
    if (isOrganizer) {
      return 220;
    }
    const eventsHeight = 3 * 92 + 2 * theme.spacing.md + 2 * theme.spacing.lg;
    return Math.max(220, eventsHeight);
  }, [isOrganizer]);

  const tabs = isOrganizer ? organizerTabs : memberTabs;
  const activeTab = isOrganizer ? organizerTab : memberTab;

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                if (isOrganizer) {
                  setOrganizerTab(tab.key as OrganizerTab);
                } else {
                  setMemberTab(tab.key as MemberTab);
                }
              }}
              style={styles.tabButton}
            >
              <Ionicons color={isActive ? theme.colors.textPrimary : theme.colors.muted} name={tab.icon} size={28} />
              {isActive ? <View style={styles.activeIndicator} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.contentArea, { minHeight: contentMinHeight }]}>
        {isOrganizer ? (
          <>
            <View style={{ display: organizerTab === "intro" ? "flex" : "none" }}>
              <ProfileIntroTab />
            </View>
            <View style={{ display: organizerTab === "organizerEvents" ? "flex" : "none" }}>
              <ProfileOrganizerEventsTab
                isOwnProfile={isOwnProfile}
                onActiveEventPress={onActiveEventPress}
                onPastEventPress={onPastEventPress}
                organizerUserId={userId}
              />
            </View>
          </>
        ) : (
          <>
            <View style={{ display: memberTab === "snaps" ? "flex" : "none" }}>
              <ProfileSnapsGrid refreshToken={refreshToken} userId={userId} />
            </View>
            <View style={{ display: memberTab === "events" ? "flex" : "none" }}>
              <MemberEventsTab />
            </View>
          </>
        )}
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
