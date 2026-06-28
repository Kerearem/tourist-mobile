import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppText } from "../../../components/ui/AppText";
import { ProfileRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { ProfileStackParamList } from "../../../navigation/types";
import { ProfileContentTabs } from "../components/ProfileContentTabs";
import { ProfileHeader } from "../components/ProfileHeader";
import { ProfileStatsRow } from "../components/ProfileStatsRow";
import { uploadProfileAvatar } from "../services/profile.service";
import type { ProfileImageSource } from "../utils/pickProfileImage";

type Props = NativeStackScreenProps<ProfileStackParamList, "ProfileScreen">;

export function ProfileScreen({ navigation }: Props) {
  const { user, updateAvatarUrl } = useAuth();
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [snapsRefreshToken, setSnapsRefreshToken] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setSnapsRefreshToken((value) => value + 1);
    }, []),
  );

  const profileDisplay = useMemo(() => {
    const fallbackName = "Tourist Member";
    if (!user) {
      return {
        displayName: fallbackName,
        username: "touristmember",
        location: "Unknown location",
        avatarUrl: undefined as string | undefined,
      };
    }

    const displayName = user.publicProfile.displayName || fallbackName;
    const username = user.publicProfile.username || displayName.replace(/\s+/g, "").toLowerCase();
    const city = user.publicProfile.currentCity || "City";
    const country = user.privateProfile.destinationCountryCode || "Country";
    return {
      displayName,
      username,
      location: `${city}, ${country}`,
      avatarUrl: user.publicProfile.avatarUrl,
    };
  }, [user]);

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

  const handleAvatarPress = useCallback(() => {
    Alert.alert("Profil fotoğrafı", "Fotoğraf kaynağını seçin", [
      { text: "Kamera", onPress: () => void handleAvatarUpload("camera") },
      { text: "Galeri", onPress: () => void handleAvatarUpload("gallery") },
      { text: "İptal", style: "cancel" },
    ]);
  }, [handleAvatarUpload]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <ProfileHeader
            avatarUrl={profileDisplay.avatarUrl}
            bio="Software Engineer living in Berlin since 2023. Love hiking, photography, and finding the best doner in town!"
            displayName={profileDisplay.displayName}
            isAvatarUploading={isAvatarUploading}
            location={profileDisplay.location}
            onAvatarPress={handleAvatarPress}
            onMenuPress={() => navigation.navigate(ProfileRoutes.SettingsScreen)}
            username={profileDisplay.username}
          />

          {avatarError ? <AppText style={styles.error}>{avatarError}</AppText> : null}

          <ProfileStatsRow events={14} helped={23} organized={5} />

          <Pressable style={styles.instagramButton}>
            <Ionicons color={theme.colors.textPrimary} name="logo-instagram" size={22} />
            <AppText style={styles.instagramText} variant="label">
              Instagram Profile
            </AppText>
          </Pressable>

          {user?.id ? <ProfileContentTabs refreshToken={snapsRefreshToken} userId={user.id} /> : null}
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
