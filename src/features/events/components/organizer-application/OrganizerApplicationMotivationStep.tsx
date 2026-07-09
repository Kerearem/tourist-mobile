import React from "react";
import { StyleSheet, View } from "react-native";

import { AppInput } from "../../../../components/ui/AppInput";
import { AppText } from "../../../../components/ui/AppText";
import { Card } from "../../../../components/ui/Card";
import { theme } from "../../../../constants/theme";
import type { OrganizerApplicationType } from "../../types/organizer";
import {
  ORGANIZER_MOTIVATION_MAX_LENGTH,
  ORGANIZER_MOTIVATION_MIN_LENGTH,
} from "../../utils/organizer-verification-wizard";

type Props = {
  applicationType: OrganizerApplicationType;
  motivation: string;
  error: string | null;
  isBlockedByAge: boolean;
  onChangeMotivation: (value: string) => void;
};

export function OrganizerApplicationMotivationStep({
  applicationType,
  motivation,
  error,
  isBlockedByAge,
  onChangeMotivation,
}: Props) {
  return (
    <Card style={styles.card}>
      <AppText variant="sectionTitle">
        {applicationType === "BUSINESS" ? "İşletmen ve hedeflerin" : "Neden organizatör olmak istiyorsun?"}
      </AppText>
      <AppText variant="bodyMuted">
        {applicationType === "BUSINESS"
          ? "İşletmenin ne yaptığını ve Tourist'te ne tür etkinlikler düzenlemek istediğini anlat."
          : "Motivasyonunu ve düzenlemek istediğin etkinlik türlerini yaz."}
      </AppText>

      {isBlockedByAge ? (
        <AppText style={styles.errorText} variant="body">
          Organizatör olmak için en az 18 yaşında olmalısın.
        </AppText>
      ) : null}

      <AppInput
        editable={!isBlockedByAge}
        label="Motivasyon"
        multiline
        numberOfLines={6}
        onChangeText={onChangeMotivation}
        placeholder={
          applicationType === "BUSINESS"
            ? "İşletmeni ve Tourist'te yapmak istediklerini yaz..."
            : "Motivasyonunu ve düzenlemek istediğin etkinlik türlerini yaz..."
        }
        style={styles.textarea}
        textAlignVertical="top"
        value={motivation}
      />

      <AppText style={styles.counter} variant="caption">
        {motivation.trim().length} / {ORGANIZER_MOTIVATION_MAX_LENGTH} (en az {ORGANIZER_MOTIVATION_MIN_LENGTH})
      </AppText>

      {error ? (
        <AppText style={styles.errorText} variant="caption">
          {error}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.sm,
  },
  textarea: {
    minHeight: 160,
  },
  counter: {
    color: theme.colors.textSecondary,
  },
  errorText: {
    color: theme.colors.danger,
  },
});
