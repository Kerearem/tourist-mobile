import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { VerifiedNameRow } from "../../../components/ui/VerifiedNameRow";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { VerificationBadgeType } from "../../../utils/verificationBadge";
import type { AccountType } from "../../../utils/verificationBadge";
import type { OrganizerStatus } from "../../../models/user";
import { ProfileAvatarRing } from "./ProfileAvatarRing";

type ProfileHeaderProps = {
  displayName: string;
  username: string;
  location?: string;
  bio: string;
  avatarUrl?: string;
  isAvatarUploading?: boolean;
  onAvatarPress?: () => void;
  onMenuPress: () => void;
  verificationBadge?: VerificationBadgeType | null;
  accountType?: AccountType | null;
  organizerStatus?: OrganizerStatus | null;
  isOrganizer?: boolean;
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
  verificationBadge,
  accountType,
  organizerStatus,
  isOrganizer,
}: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <VerifiedNameRow
          accountType={accountType}
          badgeSize={18}
          isOrganizer={isOrganizer}
          name={`@${username}`}
          organizerStatus={organizerStatus}
          style={styles.usernameRow}
          textStyle={styles.username}
          verificationBadge={verificationBadge}
        />
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
        <VerifiedNameRow
          accountType={accountType}
          badgeSize={20}
          isOrganizer={isOrganizer}
          name={displayName}
          organizerStatus={organizerStatus}
          style={styles.nameRow}
          textStyle={styles.name}
          verificationBadge={verificationBadge}
        />
        {location ? (
          <View style={styles.locationRow}>
            <Ionicons color={theme.colors.textSecondary} name="location-outline" size={16} />
            <AppText style={styles.location} variant="bodyMuted">
              {location}
            </AppText>
          </View>
        ) : null}
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
  usernameRow: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  username: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  menuButton: {
    padding: theme.spacing.xs,
  },
  identity: {
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  nameRow: {
    justifyContent: "center",
  },
  name: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
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
