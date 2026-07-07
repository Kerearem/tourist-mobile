import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DateTime } from "luxon";

import { AppInput } from "../../../../../components/ui/AppInput";
import { AppText } from "../../../../../components/ui/AppText";
import { getCountryByCode, getCountryLabel } from "../../../../../constants/countries";
import { theme } from "../../../../../constants/theme";
import { EventDateTimePicker } from "../../EventDateTimePicker";
import type { EventCreationDraft, EventCreationFieldErrors } from "../../../types/eventCreation";
import {
  dateFromWallClock,
  formatTimezoneOptionLabel,
  formatWallClockInTimezone,
  getNowWallClockInTimezone,
  isValidIanaTimezone,
} from "../../../utils/eventTimezone";
import { FieldError, FIELD_RADIUS, StepSection, errorBorder, inputFieldStyle } from "../createEventUi";

type DateLocationStepProps = {
  draft: EventCreationDraft;
  errors: EventCreationFieldErrors;
  onChange: (patch: Partial<EventCreationDraft>) => void;
  onSetStartsAt: (date: Date) => void;
  onOpenLocationPicker: () => void;
  onOpenTimezonePicker: () => void;
  onClearError: (key: keyof EventCreationFieldErrors) => void;
};

export function DateLocationStep({
  draft,
  errors,
  onChange,
  onSetStartsAt,
  onOpenLocationPicker,
  onOpenTimezonePicker,
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

  const timezoneLabel = draft.timezone.trim()
    ? formatTimezoneOptionLabel(draft.timezone)
    : "Saat dilimi seç";

  const minimumStartDate = useMemo(() => {
    if (!isValidIanaTimezone(draft.timezone)) {
      return new Date();
    }

    const wall = getNowWallClockInTimezone(draft.timezone, DateTime.utc());
    return wall ? dateFromWallClock(wall) : new Date();
  }, [draft.timezone]);

  const formatPickerLabel = (date: Date) =>
    isValidIanaTimezone(draft.timezone)
      ? formatWallClockInTimezone(
          {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            hour: date.getHours(),
            minute: date.getMinutes(),
          },
          draft.timezone,
        )
      : date.toLocaleString("tr-TR");

  return (
    <StepSection>
      <View style={styles.card}>
        <View style={styles.fieldBlock}>
          <AppText variant="label">Etkinlik Saat Dilimi</AppText>
          <AppText variant="caption">Tarih ve saatler bu saat dilimine göre yorumlanır.</AppText>
          <Pressable
            onPress={onOpenTimezonePicker}
            style={[styles.selectField, errorBorder(Boolean(errors.timezone))]}
          >
            <View style={styles.timezoneValue}>
              <AppText variant="body">{draft.timezone.trim() || "Saat dilimi seç"}</AppText>
              <AppText style={styles.timezoneHint} variant="caption">
                {timezoneLabel}
              </AppText>
            </View>
            <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
          </Pressable>
          <FieldError message={errors.timezone} />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.fieldBlock}>
          <AppText variant="label">Başlangıç Tarihi ve Saati</AppText>
          <AppText variant="caption">{formatPickerLabel(draft.startsAt)}</AppText>
          <View style={errorBorder(Boolean(errors.startsAt))}>
            <EventDateTimePicker
              minimumDate={minimumStartDate}
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
          <AppText variant="caption">{formatPickerLabel(draft.endsAt)}</AppText>
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
    paddingVertical: theme.spacing.sm,
  },
  timezoneValue: {
    flex: 1,
    gap: 2,
    paddingRight: theme.spacing.sm,
  },
  timezoneHint: {
    color: theme.colors.textSecondary,
  },
});
