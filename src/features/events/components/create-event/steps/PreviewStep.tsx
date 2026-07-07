import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "../../../../../components/ui/AppText";
import { getCountryByCode, getCountryLabel } from "../../../../../constants/countries";
import { theme } from "../../../../../constants/theme";
import { getEventTypeLabel } from "../../../constants/eventTypes";
import type { EventCreationDraft, EventCreationStep } from "../../../types/eventCreation";
import { formatEventTicketOfferingLabel } from "../../../utils/eventTicketPricing";
import { formatTimezoneOptionLabel, formatWallClockInTimezone, wallClockFromDate } from "../../../utils/eventTimezone";
import { EventCreationPreviewCard } from "../EventCreationPreviewCard";
import { FIELD_RADIUS, StepSection } from "../createEventUi";

type PreviewStepProps = {
  draft: EventCreationDraft;
  submitError: string | null;
  onEditStep: (step: EventCreationStep) => void;
};

const formatMinAgeLabel = (minAge: EventCreationDraft["minAge"]) => {
  if (minAge == null) {
    return "Genel (16+)";
  }
  return `${minAge}+`;
};

export function PreviewStep({ draft, submitError, onEditStep }: PreviewStepProps) {
  const country = draft.countryCode ? getCountryByCode(draft.countryCode) : null;
  const countryName = country ? getCountryLabel(country, "tr") : draft.countryCode;
  const ticketLabel =
    draft.ticketMode === "free"
      ? formatEventTicketOfferingLabel({ tokenPrice: 0 })
      : formatEventTicketOfferingLabel({ tokenPrice: Number(draft.tokenPriceInput) || 0 });

  return (
    <StepSection title="Önizleme">
      <EventCreationPreviewCard draft={draft} />

      <View style={styles.summaryList}>
        <SummarySection
          onEdit={() => onEditStep(1)}
          rows={[
            ["Tür", draft.eventType ? getEventTypeLabel(draft.eventType) : "—"],
            ["Başlık", draft.title.trim() || "—"],
            ["Açıklama", draft.description.trim() || "—"],
            ["Kapak", draft.coverUri ? "Seçildi" : "Yok"],
          ]}
          title="Temel bilgiler"
        />
        <SummarySection
          onEdit={() => onEditStep(2)}
          rows={[
            ["Başlangıç", formatWallClockInTimezone(wallClockFromDate(draft.startsAt), draft.timezone)],
            ["Bitiş", formatWallClockInTimezone(wallClockFromDate(draft.endsAt), draft.timezone)],
            ["Mekân", draft.venueName.trim() || "—"],
            ["Konum", draft.city && countryName ? `${draft.city}, ${countryName}` : "—"],
            ["Saat dilimi", draft.timezone.trim() ? formatTimezoneOptionLabel(draft.timezone) : "—"],
          ]}
          title="Tarih ve konum"
        />
        <SummarySection
          onEdit={() => onEditStep(3)}
          rows={[
            ["Kapasite", draft.capacityInput.trim() || "—"],
            ["Görünürlük", draft.visibility === "city" ? "Şehir" : "Ülke"],
            ["Yaş", formatMinAgeLabel(draft.minAge)],
            ["Alkol", draft.hasAlcohol ? "Var" : "Yok"],
            ["Sigara", draft.smokingAllowed ? "İzinli" : "Yasak"],
          ]}
          title="Katılım"
        />
        <SummarySection
          onEdit={() => onEditStep(4)}
          rows={[["Bilet", ticketLabel]]}
          title="Bilet"
        />
      </View>

      {submitError ? (
        <AppText style={styles.submitError} variant="caption">
          {submitError}
        </AppText>
      ) : null}
    </StepSection>
  );
}

function SummarySection({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: Array<[string, string]>;
  onEdit: () => void;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <AppText variant="label">{title}</AppText>
        <Pressable onPress={onEdit}>
          <AppText style={styles.editLink} variant="label">
            Düzenle
          </AppText>
        </Pressable>
      </View>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.summaryRow}>
          <AppText style={styles.summaryLabel} variant="caption">
            {label}
          </AppText>
          <AppText style={styles.summaryValue} variant="body">
            {value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  summaryList: {
    gap: theme.spacing.md,
  },
  summaryCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  summaryHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  editLink: {
    color: theme.colors.primary,
  },
  summaryRow: {
    gap: 2,
  },
  summaryLabel: {
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    color: theme.colors.textPrimary,
  },
  submitError: {
    color: theme.colors.danger,
    textAlign: "center",
  },
});
