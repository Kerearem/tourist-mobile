import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppInput } from "../../../../../components/ui/AppInput";
import { AppText } from "../../../../../components/ui/AppText";
import { getCountryByCode, getCountryLabel } from "../../../../../constants/countries";
import { theme } from "../../../../../constants/theme";
import { EventDateTimePicker } from "../../EventDateTimePicker";
import type { EventCreationDraft, EventCreationFieldErrors } from "../../../types/eventCreation";
import { FieldError, FIELD_RADIUS, StepSection, errorBorder, inputFieldStyle } from "../createEventUi";

type DateLocationStepProps = {
  draft: EventCreationDraft;
  errors: EventCreationFieldErrors;
  onChange: (patch: Partial<EventCreationDraft>) => void;
  onSetStartsAt: (date: Date) => void;
  onOpenLocationPicker: () => void;
  onClearError: (key: keyof EventCreationFieldErrors) => void;
};

const formatDateTimeLabel = (date: Date) =>
  date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function DateLocationStep({
  draft,
  errors,
  onChange,
  onSetStartsAt,
  onOpenLocationPicker,
  onClearError,
}: DateLocationStepProps) {
  const locationLabel = useMemo(() => {
    if (!draft.countryCode || !draft.city.trim()) {
      return "Ülke ve şehir seç";
    }
    const country = getCountryByCode(draft.countryCode);
    const countryName = country ? getCountryLabel(country, "tr") : draft.countryCode;
    return `${draft.city}, ${countryName}`;
  }, [draft.city, draft.countryCode]);

  const timezoneLabel = draft.timezone?.trim() || "Cihaz saat dilimi kullanılamıyor";

  return (
    <StepSection>
      <View style={styles.card}>
        <View style={styles.fieldBlock}>
          <AppText variant="label">Başlangıç Tarihi ve Saati</AppText>
          <AppText variant="caption">{formatDateTimeLabel(draft.startsAt)}</AppText>
          <View style={errorBorder(Boolean(errors.startsAt))}>
            <EventDateTimePicker
              minimumDate={new Date()}
              onChange={(value) => {
                onSetStartsAt(value);
                onClearError("startsAt");
                onClearError("endsAt");
              }}
              value={draft.startsAt}
            />
          </View>
          <FieldError message={errors.startsAt} />
        </View>

        <View style={styles.fieldBlock}>
          <AppText variant="label">Bitiş Tarihi ve Saati</AppText>
          <AppText variant="caption">{formatDateTimeLabel(draft.endsAt)}</AppText>
          <View style={[styles.pickerWrap, errorBorder(Boolean(errors.endsAt))]}>
            <EventDateTimePicker
              minimumDate={draft.startsAt}
              onChange={(value) => {
                onChange({ endsAt: value });
                onClearError("endsAt");
              }}
              value={draft.endsAt}
            />
          </View>
          <FieldError message={errors.endsAt} />
        </View>
      </View>

      <View style={styles.card}>
        <AppInput
          error={errors.venueName}
          label="Mekân Adı"
          onChangeText={(value) => {
            onChange({ venueName: value });
            onClearError("venueName");
          }}
          placeholder="Kreuzberg Topluluk Merkezi"
          style={inputFieldStyle}
          value={draft.venueName}
        />

        <View style={styles.fieldBlock}>
          <AppText variant="label">Şehir / Ülke</AppText>
          <Pressable
            onPress={onOpenLocationPicker}
            style={[styles.selectField, errorBorder(Boolean(errors.location))]}
          >
            <AppText variant="body">{locationLabel}</AppText>
            <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
          </Pressable>
          <FieldError message={errors.location} />
        </View>

        <View style={styles.timezoneBox}>
          <Ionicons color={theme.colors.primary} name="time-outline" size={18} />
          <View style={styles.timezoneText}>
            <AppText variant="label">Saat dilimi</AppText>
            <AppText variant="caption">{timezoneLabel}</AppText>
          </View>
        </View>
      </View>
    </StepSection>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    gap: theme.spacing.md,
    padding: theme.spacing.md,
  },
  fieldBlock: {
    gap: theme.spacing.xs,
  },
  pickerWrap: {
    borderColor: "transparent",
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    padding: 1,
  },
  selectField: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.border,
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
  },
  timezoneBox: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: FIELD_RADIUS,
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  timezoneText: {
    flex: 1,
    gap: 2,
  },
});
