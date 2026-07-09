import React from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "../../../../components/ui/AppText";
import { theme } from "../../../../constants/theme";
import type { OrganizerWizardStepId } from "../../utils/organizer-verification-wizard";
import { getWizardProgress } from "../../utils/organizer-verification-wizard";

type Props = {
  steps: OrganizerWizardStepId[];
  currentStepId: OrganizerWizardStepId;
};

export function OrganizerApplicationProgress({ steps, currentStepId }: Props) {
  const { current, total, progress } = getWizardProgress(steps, currentStepId);

  return (
    <View style={styles.container}>
      <AppText style={styles.label} variant="caption">
        Adım {current} / {total}
      </AppText>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.textSecondary,
  },
  track: {
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    height: 6,
    overflow: "hidden",
  },
  fill: {
    backgroundColor: theme.colors.primary,
    height: "100%",
  },
});
