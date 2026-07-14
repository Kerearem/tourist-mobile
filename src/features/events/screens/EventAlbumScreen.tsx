import React, { useCallback, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppText } from "../../../components/ui/AppText";
import { AppButton } from "../../../components/ui/AppButton";
import { ErrorState } from "../../../components/ui/ErrorState";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { theme } from "../../../constants/theme";
import { EventMomentsGrid } from "../components/EventMomentsGrid";
import { getEventAlbum } from "../services/events.service";
import type { EventAlbum } from "../types";
import type { EventsStackParamList, ProfileStackParamList } from "../../../navigation/types";
import { formatEventDateTimeRange } from "../utils/eventTimezone";

type Props = NativeStackScreenProps<
  EventsStackParamList & ProfileStackParamList,
  "EventAlbumScreen"
>;

const STAR_COLOR = "#F59E0B";
const STAR_SIZE = 24;

type AlbumStarRatingProps = {
  rating: number;
  starCount?: number;
};

function AlbumStarRating({ rating, starCount = 5 }: AlbumStarRatingProps) {
  const clampedRating = Math.min(starCount, Math.max(0, rating));

  return (
    <View style={styles.starRow}>
      {Array.from({ length: starCount }, (_, index) => {
        const filledThreshold = index + 1;
        const halfThreshold = index + 0.5;
        let iconName: keyof typeof Ionicons.glyphMap = "star-outline";
        if (clampedRating >= filledThreshold) {
          iconName = "star";
        } else if (clampedRating >= halfThreshold) {
          iconName = "star-half";
        }

        return <Ionicons key={index} color={STAR_COLOR} name={iconName} size={STAR_SIZE} />;
      })}
    </View>
  );
}

const formatEventDate = (startsAt: string, endsAt: string | undefined, timezone?: string) =>
  formatEventDateTimeRange(startsAt, endsAt, timezone, "tr-TR");

export function EventAlbumScreen({ navigation, route }: Props) {
  const [album, setAlbum] = useState<EventAlbum | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlbum = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getEventAlbum(route.params.eventId);
      setAlbum(data);
      setError(null);
    } catch {
      setAlbum(null);
      setError("Etkinlik albümü yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, [route.params.eventId]);

  useFocusEffect(
    useCallback(() => {
      void loadAlbum();
    }, [loadAlbum]),
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <AppText variant="bodyMuted">Albüm yükleniyor...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !album) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pagePadding}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Etkinlik Albümü" />
        </View>
        <View style={styles.centerState}>
          <ErrorState onRetry={() => void loadAlbum()} subtitle={error ?? undefined} title="Albüm yüklenemedi" />
        </View>
      </SafeAreaView>
    );
  }

  const locationLabel = album.event.venueName
    ? `${album.event.venueName}, ${album.event.city}`
    : `${album.event.city}, ${album.event.countryCode}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Etkinlik Albümü" />

          <AppText style={styles.eventTitle} variant="title">
            {album.event.title}
          </AppText>
          <AppText style={styles.eventMeta} variant="bodyMuted">
            {formatEventDate(album.event.startsAt, album.event.endsAt, album.event.timezone)}
          </AppText>
          <AppText style={styles.eventMeta} variant="bodyMuted">
            {locationLabel}
          </AppText>

          {album.ratingCount > 0 && album.averageRating != null ? (
            <AlbumStarRating rating={album.averageRating} />
          ) : (
            <AppText style={styles.ratingEmpty} variant="bodyMuted">
              Henüz değerlendirme yok
            </AppText>
          )}
        </View>

        <View style={styles.momentsSection}>
          <View style={styles.momentsHeader}>
            <AppText style={styles.sectionTitle} variant="label">
              Etkinlik anıları
            </AppText>
            {album.canShareMoment ? (
              <AppButton
                containerStyle={styles.shareMomentButton}
                label="Anı Paylaş"
                onPress={() => navigation.navigate("CreateMomentScreen", { eventId: route.params.eventId })}
                variant="secondary"
              />
            ) : null}
          </View>

          {album.moments.length > 0 ? (
            <EventMomentsGrid
              eventId={route.params.eventId}
              moments={album.moments}
              onMomentsChange={(nextMoments) =>
                setAlbum((current) => (current ? { ...current, moments: nextMoments } : current))
              }
            />
          ) : (
            <View style={styles.momentsPlaceholder}>
              <Ionicons color={theme.colors.muted} name="images-outline" size={36} />
              <AppText style={styles.momentsTitle} variant="label">
                Henüz anı paylaşılmamış
              </AppText>
              <AppText style={styles.momentsHint} variant="bodyMuted">
                {album.canShareMoment
                  ? "İlk anıyı sen paylaşabilirsin."
                  : "Katılımcılar etkinlik bittikten sonra anılarını burada paylaşır."}
              </AppText>
            </View>
          )}
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
  pagePadding: {
    paddingHorizontal: theme.spacing.lg,
  },
  scrollContent: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    paddingTop: theme.spacing.md,
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.sm,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  headerSection: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  eventTitle: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  eventMeta: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  starRow: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: theme.spacing.md,
  },
  ratingEmpty: {
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  momentsSection: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
  },
  momentsHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
  },
  shareMomentButton: {
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
  },
  momentsPlaceholder: {
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
  },
  momentsTitle: {
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  momentsHint: {
    textAlign: "center",
  },
});
