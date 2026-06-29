import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { EmptyState } from "../../../components/ui/EmptyState";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import { getMySnaps, getSnapsByUser } from "../services/snaps.service";
import type { SnapItem } from "../types";
import { ProfileSnapFeedViewer } from "./ProfileSnapFeedViewer";

type ProfileSnapsGridProps = {
  userId: string;
  refreshToken?: number;
};

export function ProfileSnapsGrid({ userId, refreshToken = 0 }: ProfileSnapsGridProps) {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [snaps, setSnaps] = useState<SnapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedInitialIndex, setFeedInitialIndex] = useState(0);
  const [isFeedOpen, setIsFeedOpen] = useState(false);

  const isOwnProfile = user?.id === userId;
  const tileSize = useMemo(() => Math.floor(width / 3), [width]);
  const tileHeight = useMemo(() => Math.floor(tileSize / 0.58), [tileSize]);

  const authorFallback = useMemo(() => {
    const firstWithAuthor = snaps.find((snap) => snap.author);
    if (firstWithAuthor?.author) {
      return {
        displayName: firstWithAuthor.author.displayName,
        username: firstWithAuthor.author.username,
      };
    }

    if (isOwnProfile && user) {
      return {
        displayName: user.publicProfile.displayName,
        username: user.publicProfile.username,
      };
    }

    return {
      displayName: "Kullanıcı",
      username: "kullanici",
    };
  }, [isOwnProfile, snaps, user]);

  const openSnapFeed = (index: number) => {
    setFeedInitialIndex(index);
    setIsFeedOpen(true);
  };

  useEffect(() => {
    if (!userId) {
      setSnaps([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = isOwnProfile ? await getMySnaps() : await getSnapsByUser(userId);
        if (!cancelled) {
          setSnaps(data);
        }
      } catch (err) {
        if (!cancelled) {
          setSnaps([]);
          setError(err instanceof Error ? err.message : "Snap'ler yüklenemedi.");
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
  }, [userId, isOwnProfile, refreshToken]);

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

  if (snaps.length === 0) {
    return (
      <View style={styles.stateWrap}>
        <EmptyState
          description={isOwnProfile ? "İlk Snap'ini paylaşmak için Explore sekmesine git." : undefined}
          title="Henüz snap paylaşılmadı"
        />
      </View>
    );
  }

  return (
    <>
      <View style={styles.grid}>
        {snaps.map((snap, index) => (
          <Pressable
            key={snap.id}
            onPress={() => openSnapFeed(index)}
            style={[styles.tile, { height: tileHeight, width: tileSize }]}
          >
            <Image resizeMode="cover" source={{ uri: snap.backMediaUrl }} style={styles.tileBack} />
            <View style={styles.tileFrontWrap}>
              <Image resizeMode="cover" source={{ uri: snap.frontMediaUrl }} style={styles.tileFront} />
            </View>
          </Pressable>
        ))}
      </View>

      <ProfileSnapFeedViewer
        authorFallback={authorFallback}
        initialIndex={feedInitialIndex}
        onClose={() => setIsFeedOpen(false)}
        snaps={snaps}
        visible={isFeedOpen}
      />
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tile: {
    borderColor: "#FFFFFF",
    borderWidth: 1,
    overflow: "hidden",
  },
  tileBack: {
    height: "100%",
    width: "100%",
  },
  tileFrontWrap: {
    borderColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 1.5,
    height: 52,
    left: 8,
    overflow: "hidden",
    position: "absolute",
    top: 8,
    width: 38,
  },
  tileFront: {
    height: "100%",
    width: "100%",
  },
  stateWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  errorText: {
    textAlign: "center",
  },
});
