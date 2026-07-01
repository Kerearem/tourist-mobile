import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import { ProfileSnapsGrid } from "../../snaps/components/ProfileSnapsGrid";
import { ProfileIntroTab } from "./ProfileIntroTab";
import { ProfileMemberEventsTab } from "./ProfileMemberEventsTab";
import { ProfileOrganizerEventsTab } from "./ProfileOrganizerEventsTab";

type MemberTab = "snaps" | "events";
type OrganizerTab = "intro" | "organizerEvents";

type ProfileContentTabsProps = {
  userId: string;
  refreshToken?: number;
  isOrganizer?: boolean;
  isOwnProfile?: boolean;
  organizerDisplayName?: string;
  onActiveEventPress?: (eventId: string) => void;
  onPastEventPress?: (eventId: string) => void;
  onEventPress?: (eventId: string) => void;
  onMemberEventPress?: (eventId: string) => void;
  onCreateReel?: () => void;
};

const memberTabs: Array<{ key: MemberTab; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { key: "snaps", icon: "camera-outline", label: "Snap'ler" },
  { key: "events", icon: "calendar-outline", label: "Etkinlikler" },
];

const organizerTabs: Array<{ key: OrganizerTab; icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { key: "intro", icon: "film-outline", label: "Tanıtım" },
  { key: "organizerEvents", icon: "calendar-outline", label: "Etkinlikler" },
];

export function ProfileContentTabs({
  userId,
  refreshToken,
  isOrganizer = false,
  isOwnProfile = true,
  organizerDisplayName = "Organizatör",
  onActiveEventPress,
  onPastEventPress,
  onEventPress,
  onMemberEventPress,
  onCreateReel,
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
    return 220;
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
              <ProfileIntroTab
                canCreateReel={Boolean(isOwnProfile && isOrganizer && onCreateReel)}
                isOwnProfile={isOwnProfile}
                onCreateReel={onCreateReel}
                onEventPress={onEventPress}
                organizerDisplayName={organizerDisplayName}
                refreshToken={refreshToken}
                userId={userId}
              />
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
              <ProfileMemberEventsTab
                isOwnProfile={isOwnProfile}
                onEventPress={onMemberEventPress}
                refreshToken={refreshToken}
                userId={userId}
              />
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
});
