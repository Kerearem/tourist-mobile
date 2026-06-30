import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppText } from "../../../components/ui/AppText";
import { ErrorState } from "../../../components/ui/ErrorState";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { theme } from "../../../constants/theme";
import { getEventAlbum, rateEvent } from "../services/events.service";
import type { EventAlbum } from "../types";
import type { EventsStackParamList, ProfileStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<
  EventsStackParamList & ProfileStackParamList,
  "EventAlbumScreen"
>;

const formatEventDate = (startsAt: string, endsAt?: string) => {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) {
    return "";
  }
  const startLabel = start.toLocaleString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!endsAt) {
    return startLabel;
  }
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) {
    return startLabel;
  }
  const endLabel = end.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  return `${startLabel} – ${endLabel}`;
};

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
};

function StarRating({ value, onChange, size = 32 }: StarRatingProps) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        return (
          <Pressable
            key={star}
            disabled={!onChange}
            onPress={() => onChange?.(star)}
            style={styles.starButton}
          >
            <Ionicons color={filled ? "#F59E0B" : theme.colors.border} name="star" size={size} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function EventAlbumScreen({ navigation, route }: Props) {
  const [album, setAlbum] = useState<EventAlbum | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftRating, setDraftRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAlbum = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getEventAlbum(route.params.eventId);
      setAlbum(data);
      setDraftRating(data.viewerRating ?? 0);
      setError(null);
    } catch {
      setAlbum(null);
      setError("Etkinlik albümü yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, [route.params.eventId]);

  useEffect(() => {
    void loadAlbum();
  }, [loadAlbum]);

  const submitRating = async () => {
    if (!album?.canRate || draftRating < 1 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await rateEvent(route.params.eventId, draftRating);
      setAlbum((current) =>
        current
          ? {
              ...current,
              viewerRating: result.rating,
              averageRating: result.averageRating,
              ratingCount: result.ratingCount,
            }
          : current,
      );
    } catch {
      setError("Puan gönderilemedi.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <ScreenBackHeader onBack={() => navigation.goBack()} title="Etkinlik Albümü" />

        <View style={styles.heroCard}>
          <AppText style={styles.eventTitle} variant="title">
            {album.event.title}
          </AppText>
          <AppText style={styles.eventMeta} variant="bodyMuted">
            {formatEventDate(album.event.startsAt, album.event.endsAt)}
          </AppText>
          <AppText style={styles.eventMeta} variant="bodyMuted">
            {locationLabel}
          </AppText>

          <View style={styles.ratingSummary}>
            <StarRating size={28} value={Math.round(album.averageRating ?? 0)} />
            <AppText style={styles.ratingValue} variant="sectionTitle">
              {album.averageRating != null ? album.averageRating.toFixed(1) : "—"}
            </AppText>
            <AppText variant="bodyMuted">
              {album.ratingCount > 0 ? `${album.ratingCount} değerlendirme` : "Henüz değerlendirme yok"}
            </AppText>
          </View>
        </View>

        {album.canRate ? (
          <View style={styles.sectionCard}>
            <AppText style={styles.sectionTitle} variant="label">
              Etkinliği puanla
            </AppText>
            <AppText style={styles.sectionHint} variant="bodyMuted">
              Katılımın için teşekkürler! Deneyimini 1-5 yıldız ile paylaş.
            </AppText>
            <StarRating onChange={setDraftRating} value={draftRating} />
            <Pressable
              disabled={draftRating < 1 || isSubmitting}
              onPress={() => void submitRating()}
              style={[styles.submitButton, draftRating < 1 && styles.submitButtonDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <AppText style={styles.submitButtonText} variant="label">
                  {album.viewerRating ? "Puanı güncelle" : "Puanı gönder"}
                </AppText>
              )}
            </Pressable>
          </View>
        ) : album.viewerIsParticipant ? null : (
          <View style={styles.noteCard}>
            <Ionicons color={theme.colors.muted} name="information-circle-outline" size={20} />
            <AppText style={styles.noteText} variant="bodyMuted">
              Sadece katılanlar puan verebilir.
            </AppText>
          </View>
        )}

        <View style={styles.sectionCard}>
          <AppText style={styles.sectionTitle} variant="label">
            Etkinlik anıları
          </AppText>
          <View style={styles.momentsPlaceholder}>
            <Ionicons color={theme.colors.muted} name="images-outline" size={36} />
            <AppText style={styles.momentsTitle} variant="label">
              Henüz anı paylaşılmamış
            </AppText>
            <AppText style={styles.momentsHint} variant="bodyMuted">
              Katılımcı momentleri yakında burada görünecek.
            </AppText>
          </View>
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
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  centerState: {
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.sm,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  heroCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  eventTitle: {
    color: theme.colors.textPrimary,
  },
  eventMeta: {
    color: theme.colors.textSecondary,
  },
  ratingSummary: {
    alignItems: "center",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  ratingValue: {
    color: theme.colors.textPrimary,
  },
  starRow: {
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  starButton: {
    padding: theme.spacing.xs,
  },
  sectionCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
  },
  sectionHint: {
    color: theme.colors.textSecondary,
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    justifyContent: "center",
    minHeight: 48,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#FFFFFF",
  },
  noteCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  noteText: {
    flex: 1,
  },
  momentsPlaceholder: {
    alignItems: "center",
    gap: theme.spacing.sm,
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
