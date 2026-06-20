import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import { ProfileAvatarRing } from "./ProfileAvatarRing";

type ProfileHeaderProps = {
  displayName: string;
  username: string;
  location: string;
  bio: string;
  avatarUrl?: string;
  isAvatarUploading?: boolean;
  onAvatarPress?: () => void;
  onMenuPress: () => void;
};

export function ProfileHeader({
  displayName,
  username,
  location,
  bio,
  avatarUrl,
  isAvatarUploading = false,
  onAvatarPress,
  onMenuPress,
}: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <AppText style={styles.username} variant="sectionTitle">
          @{username}
        </AppText>
        <Pressable onPress={onMenuPress} style={styles.menuButton}>
          <Ionicons color={theme.colors.textPrimary} name="menu" size={28} />
        </Pressable>
      </View>

      <ProfileAvatarRing
        avatarUrl={avatarUrl}
        displayName={displayName}
        isUploading={isAvatarUploading}
        onPress={onAvatarPress}
      />

      <View style={styles.identity}>
        <AppText style={styles.name} variant="title">
          {displayName}
        </AppText>
        <View style={styles.locationRow}>
          <Ionicons color={theme.colors.textSecondary} name="location-outline" size={16} />
          <AppText style={styles.location} variant="bodyMuted">
            {location}
          </AppText>
        </View>
        <AppText style={styles.bio} variant="body">
          {bio}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xl,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: theme.spacing.lg,
  },
  username: {
    color: theme.colors.textPrimary,
  },
  menuButton: {
    padding: theme.spacing.xs,
  },
  identity: {
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  name: {
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  location: {
    textAlign: "center",
  },
  bio: {
    color: theme.colors.textPrimary,
    maxWidth: 330,
    textAlign: "center",
  },
});
