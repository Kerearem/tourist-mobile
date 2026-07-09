import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { Screen } from "../../../components/ui/Screen";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { VerifiedNameRow } from "../../../components/ui/VerifiedNameRow";
import { theme } from "../../../constants/theme";
import type { MessagesStackParamList } from "../../../navigation/types";
import { formatProfileLocation } from "../../../utils/formatProfileLocation";
import { getOrganizerPublicEvents } from "../../events/services/organizer.service";
import type { EventItem } from "../../events/types";
import { ProfileStatsRow } from "../../profile/components/ProfileStatsRow";
import { getOrganizerReels } from "../../profile/services/reels.service";
import {
  getUserProfileStats,
  getUserPublicProfile,
  type UserProfileStats,
  type UserPublicProfile,
} from "../../profile/services/userProfile.service";
import type { ReelItem } from "../../profile/types/reels";
import { getSnapsByUser } from "../../snaps/services/snaps.service";
import type { SnapItem } from "../../snaps/types";

type Props = NativeStackScreenProps<MessagesStackParamList, "MessageUserProfileScreen">;

const PREVIEW_LIMIT = 6;
const PREVIEW_COLUMNS = 3;

type ProfilePreviewState = {
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  location: string | null;
  isOrganizer: boolean;
  accountType?: "personal" | "business";
  verificationBadge?: "organizer" | "business";
};

const buildFallbackProfile = (params: Props["route"]["params"]): ProfilePreviewState => ({
  displayName: params.displayName?.trim() || "Kullanıcı",
  username: params.username?.trim() || "kullanici",
  avatarUrl: params.avatarUrl,
  bio: undefined,
  location: null,
  isOrganizer: params.isOrganizer ?? false,
});

const mergeProfile = (
  fallback: ProfilePreviewState,
  profile: UserPublicProfile | null,
): ProfilePreviewState => {
  if (!profile) {
    return fallback;
  }

  return {
    displayName: profile.displayName || fallback.displayName,
    username: profile.username || fallback.username,
    avatarUrl: profile.avatarUrl ?? fallback.avatarUrl,
    bio: profile.bio,
    location: formatProfileLocation(profile.city, profile.countryCode),
    isOrganizer: profile.isOrganizer,
    accountType: profile.accountType,
    verificationBadge: profile.verificationBadge,
  };
};

const resolveSnapPreviewUrl = (snap: SnapItem) => snap.frontMediaUrl || snap.backMediaUrl;

const resolveReelPreviewUrl = (reel: ReelItem) => reel.media[0]?.url;

const resolveEventPreviewUrl = (event: EventItem) => event.coverImageUrl;

type PreviewSectionProps = {
  title: string;
  items: Array<{ id: string; imageUrl?: string; label?: string }>;
  tileSize: number;
};

function PreviewSection({ title, items, tileSize }: PreviewSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.previewSection}>
      <AppText style={styles.previewTitle} variant="sectionTitle">
        {title}
      </AppText>
      <View style={styles.previewGrid}>
        {items.map((item) => (
          <View key={item.id} style={[styles.previewTile, { width: tileSize, height: tileSize }]}>
            {item.imageUrl ? (
              <Image resizeMode="cover" source={{ uri: item.imageUrl }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewPlaceholder}>
                <AppText numberOfLines={2} style={styles.previewPlaceholderText} variant="caption">
                  {item.label ?? "—"}
                </AppText>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

export function MessageUserProfileScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const fallbackProfile = useMemo(() => buildFallbackProfile(route.params), [route.params]);
  const [profile, setProfile] = useState<ProfilePreviewState>(fallbackProfile);
  const [stats, setStats] = useState<UserProfileStats | null>(null);
  const [snaps, setSnaps] = useState<SnapItem[]>([]);
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { width: screenWidth } = useWindowDimensions();

  const previewTileSize = useMemo(() => {
    const horizontalPadding = theme.spacing.lg * 2;
    const gap = theme.spacing.xs;
    const totalGaps = gap * (PREVIEW_COLUMNS - 1);
    return (screenWidth - horizontalPadding - totalGaps) / PREVIEW_COLUMNS;
  }, [screenWidth]);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const nextFallback = buildFallbackProfile(route.params);
    setProfile(nextFallback);

    try {
      const profileResult = await getUserPublicProfile(userId);
      const mergedProfile = mergeProfile(nextFallback, profileResult);
      setProfile(mergedProfile);

      const [statsResult, snapsResult, reelsResult, eventsResult] = await Promise.allSettled([
        getUserProfileStats(userId),
        getSnapsByUser(userId),
        mergedProfile.isOrganizer ? getOrganizerReels(userId) : Promise.resolve([]),
        mergedProfile.isOrganizer ? getOrganizerPublicEvents(userId) : Promise.resolve([]),
      ]);

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value);
      } else {
        setStats(null);
      }

      setSnaps(snapsResult.status === "fulfilled" ? snapsResult.value.slice(0, PREVIEW_LIMIT) : []);
      setReels(reelsResult.status === "fulfilled" ? reelsResult.value.slice(0, PREVIEW_LIMIT) : []);
      setEvents(eventsResult.status === "fulfilled" ? eventsResult.value.slice(0, PREVIEW_LIMIT) : []);
    } catch {
      setLoadError("Profil yüklenemedi.");
      setStats(null);
      setSnaps([]);
      setReels([]);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [route.params, userId]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const snapPreviews = snaps.map((snap) => ({
    id: snap.id,
    imageUrl: resolveSnapPreviewUrl(snap),
  }));

  const reelPreviews = reels.map((reel) => ({
    id: reel.id,
    imageUrl: resolveReelPreviewUrl(reel),
    label: reel.caption ?? undefined,
  }));

  const eventPreviews = events.map((event) => ({
    id: event.id,
    imageUrl: resolveEventPreviewUrl(event),
    label: event.title,
  }));

  return (
    <Screen>
      <ScreenBackHeader onBack={() => navigation.goBack()} title="Profil" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Avatar
            initials={profile.displayName.slice(0, 2).toUpperCase()}
            size={96}
            uri={profile.avatarUrl}
          />
          <VerifiedNameRow
            accountType={profile.accountType}
            isOrganizer={profile.isOrganizer}
            name={profile.displayName}
            style={styles.displayName}
            textStyle={styles.displayNameText}
            verificationBadge={profile.verificationBadge}
          />
          <AppText style={styles.username} variant="bodyMuted">
            @{profile.username}
          </AppText>
          {profile.location ? (
            <AppText style={styles.location} variant="bodyMuted">
              {profile.location}
            </AppText>
          ) : null}
          {profile.bio ? (
            <AppText style={styles.bio} variant="body">
              {profile.bio}
            </AppText>
          ) : null}
        </View>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={theme.colors.textPrimary} />
          </View>
        ) : null}

        {!isLoading && loadError ? (
          <AppText style={styles.loadError} variant="bodyMuted">
            {loadError}
          </AppText>
        ) : null}

        <ProfileStatsRow
          events={stats?.events}
          helped={stats?.helped}
          organized={stats?.organized}
          showOrganized={profile.isOrganizer}
        />

        <PreviewSection items={snapPreviews} tileSize={previewTileSize} title="Snap" />
        {profile.isOrganizer ? (
          <>
            <PreviewSection items={reelPreviews} tileSize={previewTileSize} title="Reel" />
            <PreviewSection items={eventPreviews} tileSize={previewTileSize} title="Etkinlik" />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  hero: {
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  displayName: {
    justifyContent: "center",
  },
  displayNameText: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  username: {
    textAlign: "center",
  },
  location: {
    textAlign: "center",
  },
  bio: {
    textAlign: "center",
  },
  loadingRow: {
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
  },
  loadError: {
    textAlign: "center",
  },
  previewSection: {
    gap: theme.spacing.sm,
  },
  previewTitle: {
    fontSize: 16,
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  previewTile: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    overflow: "hidden",
  },
  previewImage: {
    height: "100%",
    width: "100%",
  },
  previewPlaceholder: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.xs,
  },
  previewPlaceholderText: {
    textAlign: "center",
  },
});
