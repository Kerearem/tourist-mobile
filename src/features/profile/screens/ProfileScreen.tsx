import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppText } from "../../../components/ui/AppText";
import { ProfileRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { ProfileStackParamList } from "../../../navigation/types";
import { formatProfileLocation } from "../../../utils/formatProfileLocation";
import { ProfileContentTabs } from "../components/ProfileContentTabs";
import { ProfileHeader } from "../components/ProfileHeader";
import { ProfileStatsRow } from "../components/ProfileStatsRow";
import { getUserProfileStats, type UserProfileStats } from "../services/userProfile.service";
import { uploadProfileAvatar } from "../services/profile.service";
import type { ProfileImageSource } from "../utils/pickProfileImage";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileScreen">;

export function ProfileScreen({ navigation }: Props) {
  const { user, updateAvatarUrl } = useAuth();
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [snapsRefreshToken, setSnapsRefreshToken] = useState(0);
  const [profileStats, setProfileStats] = useState<UserProfileStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      setSnapsRefreshToken((value) => value + 1);
    }, []),
  );

  useEffect(() => {
    if (!user?.id) {
      setProfileStats(null);
      return;
    }

    void (async () => {
      try {
        const stats = await getUserProfileStats(user.id);
        setProfileStats(stats);
      } catch {
        setProfileStats(null);
      }
    })();
  }, [user?.id, snapsRefreshToken]);

  const profileDisplay = useMemo(() => {
    const fallbackName = "Tourist Member";
    if (!user) {
      return {
        displayName: fallbackName,
        username: "touristmember",
        location: undefined as string | undefined,
        avatarUrl: undefined as string | undefined,
      };
    }

    const displayName = user.publicProfile.displayName || fallbackName;
    const username = user.publicProfile.username || displayName.replace(/\s+/g, "").toLowerCase();
    const location =
      formatProfileLocation(
        user.publicProfile.currentCity || user.privateProfile.destinationCity,
        user.privateProfile.destinationCountryCode,
      ) ?? undefined;
    return {
      displayName,
      username,
      location,
      avatarUrl: user.publicProfile.avatarUrl,
    };
  }, [user]);

  const isApprovedOrganizer = user?.organizerStatus === "approved";

  const handleAvatarUpload = useCallback(
    async (source: ProfileImageSource) => {
      setAvatarError("");
      setIsAvatarUploading(true);

      try {
        const updatedUser = await uploadProfileAvatar(source);
        updateAvatarUrl(updatedUser.publicProfile.avatarUrl ?? "");
      } catch (error) {
        if (error instanceof Error && error.message === "CANCELLED") {
          return;
        }
        setAvatarError(error instanceof Error ? error.message : "Profil fotoğrafı yüklenemedi.");
      } finally {
        setIsAvatarUploading(false);
      }
    },
    [updateAvatarUrl],
  );

  const handleAvatarSourcePicker = useCallback(() => {
    Alert.alert("Profil fotoğrafı", "Fotoğraf kaynağını seçin", [
      { text: "Kamera", onPress: () => void handleAvatarUpload("camera") },
      { text: "Galeri", onPress: () => void handleAvatarUpload("gallery") },
      { text: "İptal", style: "cancel" },
    ]);
  }, [handleAvatarUpload]);

  const handleAvatarPress = useCallback(() => {
    if (isApprovedOrganizer) {
      Alert.alert("Ekle", "Ne yapmak istersin?", [
        {
          text: "Tanıtım ekle",
          onPress: () => navigation.navigate(ProfileRoutes.CreateReelScreen),
        },
        { text: "Profil fotoğrafı", onPress: handleAvatarSourcePicker },
        { text: "İptal", style: "cancel" },
      ]);
      return;
    }

    handleAvatarSourcePicker();
  }, [handleAvatarSourcePicker, isApprovedOrganizer, navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <ProfileHeader
            accountType={user?.accountType}
            avatarUrl={profileDisplay.avatarUrl}
            bio="Software Engineer living in Berlin since 2023. Love hiking, photography, and finding the best doner in town!"
            displayName={profileDisplay.displayName}
            isAvatarUploading={isAvatarUploading}
            isOrganizer={isApprovedOrganizer}
            location={profileDisplay.location}
            onAvatarPress={handleAvatarPress}
            onMenuPress={() => navigation.navigate(ProfileRoutes.SettingsScreen)}
            organizerStatus={user?.organizerStatus}
            username={profileDisplay.username}
            verificationBadge={user?.verificationBadge}
          />

          {avatarError ? <AppText style={styles.error}>{avatarError}</AppText> : null}

          <ProfileStatsRow
            events={profileStats?.events}
            helped={profileStats?.helped}
            organized={profileStats?.organized}
            showOrganized={isApprovedOrganizer}
          />

          <Pressable style={styles.instagramButton}>
            <Ionicons color={theme.colors.textPrimary} name="logo-instagram" size={22} />
            <AppText style={styles.instagramText} variant="label">
              Instagram Profile
            </AppText>
          </Pressable>

          {user?.id ? (
            <ProfileContentTabs
              isOrganizer={user.organizerStatus === "approved"}
              isOwnProfile
              onActiveEventPress={(eventId) =>
                navigation.navigate(ProfileRoutes.EventDetailScreen, { eventId })
              }
              onMemberEventPress={(eventId) =>
                navigation.navigate(ProfileRoutes.EventAlbumScreen, { eventId })
              }
              onPastEventPress={(eventId) =>
                navigation.navigate(ProfileRoutes.EventAlbumScreen, { eventId })
              }
              organizerDisplayName={profileDisplay.displayName}
              refreshToken={snapsRefreshToken}
              userId={user.id}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  container: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  error: {
    color: "#DC2626",
    textAlign: "center",
  },
  instagramButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    minHeight: 58,
    width: "88%",
  },
  instagramText: {
    color: theme.colors.textPrimary,
    fontSize: 17,
  },
});
