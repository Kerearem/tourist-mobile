import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { cloudinaryVideoPoster } from "../../../components/media/MediaCarousel";
import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import { getOrganizerReels } from "../services/reels.service";
import type { ReelItem } from "../types/reels";
import { ProfileReelsFeedViewer } from "./ProfileReelsFeedViewer";

type ProfileIntroTabProps = {
  userId: string;
  refreshToken?: number;
  isOwnProfile?: boolean;
  canCreateReel?: boolean;
  organizerDisplayName?: string;
  onCreateReel?: () => void;
  onEventPress?: (eventId: string) => void;
};

const getReelPreviewUrl = (reel: ReelItem) => {
  const first = reel.media.slice().sort((a, b) => a.order - b.order)[0];
  if (!first) {
    return null;
  }
  if (first.type === "VIDEO") {
    return cloudinaryVideoPoster(first.url);
  }
  return first.url;
};

export function ProfileIntroTab({
  userId,
  refreshToken = 0,
  isOwnProfile = false,
  canCreateReel = false,
  organizerDisplayName = "Organizatör",
  onCreateReel,
  onEventPress,
}: ProfileIntroTabProps) {
  const { width } = useWindowDimensions();
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedInitialIndex, setFeedInitialIndex] = useState(0);
  const [isFeedOpen, setIsFeedOpen] = useState(false);

  const tileSize = useMemo(() => Math.floor(width / 3), [width]);
  const tileHeight = useMemo(() => Math.floor(tileSize * 1.35), [tileSize]);

  useEffect(() => {
    if (!userId) {
      setReels([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getOrganizerReels(userId);
        if (!cancelled) {
          setReels(data);
        }
      } catch (err) {
        if (!cancelled) {
          setReels([]);
          setError(err instanceof Error ? err.message : "Tanıtım içerikleri yüklenemedi.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, refreshToken]);

  const openReelFeed = (index: number) => {
    setFeedInitialIndex(index);
    setIsFeedOpen(true);
  };

  if (isLoading) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateWrap}>
        <AppText style={styles.errorText} variant="bodyMuted">
          {error}
        </AppText>
      </View>
    );
  }

  if (reels.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.iconWrap}>
          <Ionicons color={theme.colors.muted} name="film-outline" size={40} />
        </View>
        <AppText style={styles.title} variant="label">
          {isOwnProfile ? "İlk tanıtımını ekle" : "Henüz tanıtım yok"}
        </AppText>
        <AppText style={styles.subtitle} variant="bodyMuted">
          {isOwnProfile
            ? "Etkinliklerini ve markanı tanıtan fotoğraf veya videolar paylaş."
            : "Bu organizatör henüz tanıtım içeriği paylaşmadı."}
        </AppText>
        {canCreateReel ? (
          <AppButton
            containerStyle={styles.createButton}
            label="Tanıtım Ekle"
            onPress={onCreateReel}
            variant="secondary"
          />
        ) : null}
      </View>
    );
  }

  return (
    <>
      {canCreateReel ? (
        <View style={styles.toolbar}>
          <AppButton
            containerStyle={styles.toolbarButton}
            label="Tanıtım Ekle"
            onPress={onCreateReel}
            variant="secondary"
          />
        </View>
      ) : null}

      <View style={styles.grid}>
        {reels.map((reel, index) => {
          const previewUrl = getReelPreviewUrl(reel);
          const hasVideo = reel.media.some((item) => item.type === "VIDEO");

          return (
            <Pressable
              key={reel.id}
              onPress={() => openReelFeed(index)}
              style={[styles.tile, { height: tileHeight, width: tileSize }]}
            >
              {previewUrl ? (
                <Image resizeMode="cover" source={{ uri: previewUrl }} style={styles.tileImage} />
              ) : (
                <View style={styles.tileFallback}>
                  <Ionicons color={theme.colors.muted} name="film-outline" size={28} />
                </View>
              )}
              {hasVideo ? (
                <View style={styles.videoBadge}>
                  <Ionicons color="#FFFFFF" name="play" size={14} />
                </View>
              ) : null}
              {reel.media.length > 1 ? (
                <View style={styles.countBadge}>
                  <Ionicons color="#FFFFFF" name="copy-outline" size={12} />
                  <AppText style={styles.countBadgeText} variant="caption">
                    {reel.media.length}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <ProfileReelsFeedViewer
        initialIndex={feedInitialIndex}
        isOwnProfile={isOwnProfile}
        onClose={() => setIsFeedOpen(false)}
        onEventPress={onEventPress}
        onReelDeleted={(reelId) => {
          setReels((current) => current.filter((item) => item.id !== reelId));
        }}
        organizerDisplayName={organizerDisplayName}
        reels={reels}
        visible={isFeedOpen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  stateWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  emptyContainer: {
    alignItems: "center",
    gap: theme.spacing.sm,
    justifyContent: "center",
    minHeight: 220,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    height: 72,
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
    width: 72,
  },
  title: {
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  createButton: {
    marginTop: theme.spacing.md,
    minWidth: 180,
  },
  toolbar: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  toolbarButton: {
    alignSelf: "flex-start",
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tile: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.background,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  tileImage: {
    height: "100%",
    width: "100%",
  },
  tileFallback: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    flex: 1,
    justifyContent: "center",
  },
  videoBadge: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    bottom: 8,
    height: 24,
    justifyContent: "center",
    left: 8,
    position: "absolute",
    width: 24,
  },
  countBadge: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: theme.radius.sm,
    flexDirection: "row",
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 3,
    position: "absolute",
    right: 8,
    top: 8,
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
  },
  errorText: {
    textAlign: "center",
  },
});
