import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppInput } from "../../../../../components/ui/AppInput";
import { AppText } from "../../../../../components/ui/AppText";
import { theme } from "../../../../../constants/theme";
import { DEFAULT_EVENT_CREATION_CAPABILITIES } from "../../../utils/eventCreationCapabilities";
import type { EventCreationDraft, EventCreationFieldErrors } from "../../../types/eventCreation";
import { FieldError, FIELD_RADIUS, SELECTED_BG, SELECTED_BORDER, StepSection, inputFieldStyle } from "../createEventUi";

type TicketsStepProps = {
  draft: EventCreationDraft;
  errors: EventCreationFieldErrors;
  onChange: (patch: Partial<EventCreationDraft>) => void;
  onClearError: (key: keyof EventCreationFieldErrors) => void;
};

export function TicketsStep({ draft, errors, onChange, onClearError }: TicketsStepProps) {
  const capabilities = DEFAULT_EVENT_CREATION_CAPABILITIES;

  return (
    <StepSection>
      <AppText variant="caption">
        Bu etkinlik için {capabilities.maxTicketOptionsPerEvent} bilet seçeneği kullanılabilir.
      </AppText>

      <View style={styles.choiceColumn}>
        <TicketModeCard
          active={draft.ticketMode === "free"}
          description="Katılımcılar token harcamadan katılabilir."
          label="Ücretsiz Etkinlik"
          onPress={() => {
            onChange({ ticketMode: "free", tokenPriceInput: "" });
            onClearError("tokenPrice");
          }}
        />
        <TicketModeCard
          active={draft.ticketMode === "token"}
          description="Katılımcılar belirlediğin token miktarını kişi başı öder."
          label="Token ile Biletli"
          onPress={() => onChange({ ticketMode: "token" })}
        />
      </View>

      {draft.ticketMode === "token" ? (
        <View style={styles.card}>
          <AppInput
            error={errors.tokenPrice}
            keyboardType="number-pad"
            label="Bilet Fiyatı"
            onChangeText={(value) => {
              onChange({ tokenPriceInput: value });
              onClearError("tokenPrice");
            }}
            placeholder="25"
            style={inputFieldStyle}
            value={draft.tokenPriceInput}
          />
          <AppText variant="caption">Token · kişi başı</AppText>
        </View>
      ) : null}
    </StepSection>
  );
}

function TicketModeCard({
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
    <Pressable onPress={onPress} style={[styles.modeCard, active && styles.modeCardActive]}>
      <AppText style={[styles.modeLabel, active && styles.modeLabelActive]} variant="sectionTitle">
        {label}
      </AppText>
      <AppText style={styles.modeDescription} variant="bodyMuted">
        {description}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choiceColumn: {
    gap: theme.spacing.md,
  },
  modeCard: {
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.border,
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    gap: theme.spacing.sm,
    minHeight: 110,
    padding: theme.spacing.lg,
  },
  modeCardActive: {
    backgroundColor: SELECTED_BG,
    borderColor: SELECTED_BORDER,
  },
  modeLabel: {
    color: theme.colors.textPrimary,
  },
  modeLabelActive: {
    color: SELECTED_BORDER,
  },
  modeDescription: {
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderColor: theme.colors.border,
    borderRadius: FIELD_RADIUS,
    borderWidth: 1,
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
  },
});
