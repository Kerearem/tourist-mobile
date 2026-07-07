import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../../components/ui/AppText";
import { Card } from "../../../../components/ui/Card";
import { getCountryByCode, getCountryLabel } from "../../../../constants/countries";
import { theme } from "../../../../constants/theme";
import { getEventTypeEmoji, getEventTypeLabel } from "../../constants/eventTypes";
import type { EventCreationDraft } from "../../types/eventCreation";
import { formatEventTicketOfferingLabel } from "../../utils/eventTicketPricing";

type EventCreationPreviewCardProps = {
  draft: EventCreationDraft;
};

const formatDateTimeLabel = (date: Date) =>
  date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatMinAgeLabel = (minAge: EventCreationDraft["minAge"]) => {
  if (minAge == null) {
    return "Genel (16+)";
  }
  return `${minAge}+`;
};

const formatVisibilityLabel = (visibility: EventCreationDraft["visibility"]) =>
  visibility === "city" ? "Şehir görünürlüğü" : "Ülke görünürlüğü";

export function EventCreationPreviewCard({ draft }: EventCreationPreviewCardProps) {
  const country = draft.countryCode ? getCountryByCode(draft.countryCode) : null;
  const countryName = country ? getCountryLabel(country, "tr") : draft.countryCode;
  const locationLabel = [draft.venueName.trim(), draft.city.trim(), countryName].filter(Boolean).join(" · ");
  const ticketLabel =
    draft.ticketMode === "free"
      ? formatEventTicketOfferingLabel({ tokenPrice: 0 })
      : formatEventTicketOfferingLabel({ tokenPrice: Number(draft.tokenPriceInput) || 0 });

  return (
    <Card style={styles.card}>
      {draft.coverUri ? (
        <Image source={{ uri: draft.coverUri }} style={styles.cover} />
      ) : (
        <View style={styles.coverPlaceholder}>
          <Ionicons color={theme.colors.muted} name="image-outline" size={36} />
          <AppText style={styles.placeholderText} variant="caption">
            Kapak fotoğrafı yok
          </AppText>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.typeRow}>
          <AppText style={styles.typeMeta} variant="caption">
            {draft.eventType ? `${getEventTypeEmoji(draft.eventType)} ${getEventTypeLabel(draft.eventType)}` : "Tür seçilmedi"}
          </AppText>
        </View>

        <AppText style={styles.title} variant="sectionTitle">
          {draft.title.trim() || "Etkinlik başlığı"}
        </AppText>

        <AppText style={styles.meta} variant="bodyMuted">
          {formatDateTimeLabel(draft.startsAt)}
        </AppText>

        <AppText style={styles.meta} variant="bodyMuted">
          {locationLabel || "Konum bilgisi"}
        </AppText>

        <View style={styles.pillRow}>
          <View style={styles.pill}>
            <Ionicons color={theme.colors.primary} name="people-outline" size={14} />
            <AppText variant="caption">{draft.capacityInput.trim() || "—"} kişi</AppText>
          </View>
          <View style={styles.pill}>
            <Ionicons color={theme.colors.primary} name="ticket-outline" size={14} />
            <AppText variant="caption">{ticketLabel}</AppText>
          </View>
        </View>

        <AppText style={styles.meta} variant="caption">
          Yaş: {formatMinAgeLabel(draft.minAge)} · Alkol: {draft.hasAlcohol ? "Var" : "Yok"} · Sigara:{" "}
          {draft.smokingAllowed ? "İzinli" : "Yasak"}
        </AppText>

        <AppText style={styles.meta} variant="caption">
          {formatVisibilityLabel(draft.visibility)}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    padding: 0,
  },
  cover: {
    aspectRatio: 16 / 9,
    width: "100%",
  },
  coverPlaceholder: {
    alignItems: "center",
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.surface,
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    justifyContent: "center",
    gap: theme.spacing.xs,
    width: "100%",
  },
  placeholderText: {
    color: theme.colors.textSecondary,
  },
  body: {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  typeRow: {},
  typeMeta: {
    color: theme.colors.textSecondary,
  },
  title: {
    color: theme.colors.textPrimary,
  },
  meta: {
    color: theme.colors.textSecondary,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  pill: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
});
