import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppInput } from "../../../../../components/ui/AppInput";
import { AppText } from "../../../../../components/ui/AppText";
import { theme } from "../../../../../constants/theme";
import type { EventCreationDraft, EventCreationFieldErrors, EventMinAgeOption } from "../../../types/eventCreation";
import { isEventMinAgeAllowedForOrganizer } from "../../../utils/viewerAge";
import { FieldError, FIELD_RADIUS, SELECTED_BG, SELECTED_BORDER, StepSection, errorBorder, inputFieldStyle } from "../createEventUi";

type ParticipationStepProps = {
  draft: EventCreationDraft;
  errors: EventCreationFieldErrors;
  organizerAge: number | null;
  onChange: (patch: Partial<EventCreationDraft>) => void;
  onClearError: (key: keyof EventCreationFieldErrors) => void;
};

const MIN_AGE_OPTIONS: Array<{ value: EventMinAgeOption; label: string }> = [
  { value: null, label: "Genel (16+)" },
  { value: 18, label: "18+" },
  { value: 21, label: "21+" },
];

export function ParticipationStep({
  draft,
  errors,
  organizerAge,
  onChange,
  onClearError,
}: ParticipationStepProps) {
  const availableMinAgeOptions = useMemo(
    () => MIN_AGE_OPTIONS.filter((item) => isEventMinAgeAllowedForOrganizer(organizerAge, item.value)),
    [organizerAge],
  );

  const canSelectAlcohol = draft.minAge === 18 || draft.minAge === 21;

  return (
    <StepSection>
      <View style={styles.card}>
        <AppInput
          error={errors.capacity}
          keyboardType="number-pad"
          label="Kapasite"
          onChangeText={(value) => {
            onChange({ capacityInput: value });
            onClearError("capacity");
          }}
          placeholder="50"
          style={inputFieldStyle}
          value={draft.capacityInput}
        />
        <AppText variant="caption">Kaç kişi katılabilir?</AppText>
      </View>

      <View style={styles.fieldBlock}>
        <AppText variant="label">Görünürlük</AppText>
        <View style={styles.choiceColumn}>
          <SelectionCard
            active={draft.visibility === "city"}
            description="Etkinlik, seçtiğin şehirdeki kullanıcılara gösterilir."
            label="Şehir"
            onPress={() => onChange({ visibility: "city" })}
          />
          <SelectionCard
            active={draft.visibility === "country"}
            description="Etkinlik, seçtiğin ülkedeki kullanıcılara gösterilir."
            label="Ülke"
            onPress={() => onChange({ visibility: "country" })}
          />
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <AppText variant="label">Yaş Sınırı</AppText>
        <AppText variant="caption">Katılım için minimum yaş</AppText>
        <View style={[styles.segmented, errorBorder(Boolean(errors.minAge))]}>
          {availableMinAgeOptions.map((item) => {
            const active = draft.minAge === item.value;
            return (
              <Pressable
                key={item.label}
                onPress={() => {
                  onChange({
                    minAge: item.value,
                    hasAlcohol: item.value == null ? false : draft.hasAlcohol,
                  });
                  onClearError("minAge");
                  onClearError("hasAlcohol");
                }}
                style={[styles.segment, active && styles.segmentActive]}
              >
                <AppText style={[styles.segmentText, active && styles.segmentTextActive]} variant="label">
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {organizerAge != null && organizerAge < 21 ? (
          <AppText variant="caption">
            21+ yaş sınırı yalnızca 21 yaş ve üzeri organizatörler tarafından seçilebilir.
          </AppText>
        ) : null}
        <FieldError message={errors.minAge} />
      </View>

      <View style={styles.fieldBlock}>
        <AppText variant="label">Alkol</AppText>
        <View style={styles.segmented}>
          <Pressable
            disabled={!canSelectAlcohol && draft.hasAlcohol}
            onPress={() => {
              onChange({ hasAlcohol: false });
              onClearError("hasAlcohol");
            }}
            style={[styles.segment, !draft.hasAlcohol && styles.segmentActive]}
          >
            <AppText style={[styles.segmentText, !draft.hasAlcohol && styles.segmentTextActive]} variant="label">
              Yok
            </AppText>
          </Pressable>
          <Pressable
            disabled={!canSelectAlcohol}
            onPress={() => {
              if (!canSelectAlcohol) {
                return;
              }
              onChange({ hasAlcohol: true });
              onClearError("hasAlcohol");
            }}
            style={[styles.segment, draft.hasAlcohol && styles.segmentActive, !canSelectAlcohol && styles.segmentDisabled]}
          >
            <AppText style={[styles.segmentText, draft.hasAlcohol && styles.segmentTextActive]} variant="label">
              Var
            </AppText>
          </Pressable>
        </View>
        {!canSelectAlcohol ? (
          <AppText variant="caption">Alkol için 18+ veya 21+ yaş sınırı seçmelisin.</AppText>
        ) : null}
        <FieldError message={errors.hasAlcohol} />
      </View>

      <View style={styles.fieldBlock}>
        <AppText variant="label">Sigara</AppText>
        <View style={styles.segmented}>
          <Pressable
            onPress={() => onChange({ smokingAllowed: false })}
            style={[styles.segment, !draft.smokingAllowed && styles.segmentActive]}
          >
            <AppText style={[styles.segmentText, !draft.smokingAllowed && styles.segmentTextActive]} variant="label">
              İçilemez
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => onChange({ smokingAllowed: true })}
            style={[styles.segment, draft.smokingAllowed && styles.segmentActive]}
          >
            <AppText style={[styles.segmentText, draft.smokingAllowed && styles.segmentTextActive]} variant="label">
              İzinli
            </AppText>
          </Pressable>
        </View>
      </View>
    </StepSection>
  );
}

function SelectionCard({
  active,
  label,
  description,
  onPress,
}: {
  active: boolean;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.selectionCard, active && styles.selectionCardActive]}>
      <AppText style={[styles.selectionLabel, active && styles.selectionLabelActive]} variant="label">
        {label}
      </AppText>
      <AppText style={styles.selectionDescription} variant="caption">
        {description}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  fieldBlock: {
    gap: theme.spacing.sm,
  },
  choiceColumn: {
    gap: theme.spacing.sm,
  },
  selectionCard: {
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.border,
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  selectionCardActive: {
    backgroundColor: SELECTED_BG,
    borderColor: SELECTED_BORDER,
  },
  selectionLabel: {
    color: theme.colors.textPrimary,
  },
  selectionLabelActive: {
    color: SELECTED_BORDER,
  },
  selectionDescription: {
    color: theme.colors.textSecondary,
  },
  segmented: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    flexDirection: "row",
    padding: 4,
  },
  segment: {
    alignItems: "center",
    borderRadius: FIELD_RADIUS - 2,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: theme.spacing.sm,
  },
  segmentActive: {
    backgroundColor: SELECTED_BG,
  },
  segmentDisabled: {
    opacity: 0.5,
  },
  segmentText: {
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  segmentTextActive: {
    color: SELECTED_BORDER,
    fontWeight: "700",
  },
});
