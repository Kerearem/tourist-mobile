import React from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "./AppText";
import { theme } from "../../constants/theme";

type Props = {
  currentStep: number;
  totalSteps: number;
};

export function FlowProgressBar({ currentStep, totalSteps }: Props) {
  const safeTotal = Math.max(1, totalSteps);
  const safeCurrent = Math.min(Math.max(currentStep, 1), safeTotal);
  const progress = (safeCurrent / safeTotal) * 100;

  return (
    <View style={styles.wrapper}>
      <View style={styles.metaRow}>
        <AppText muted style={styles.metaText} variant="caption">
          Step {safeCurrent} of {safeTotal}
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
    marginBottom: 14,
  },
  metaRow: {
    alignItems: "flex-end",
  },
  metaText: {
    fontSize: 12,
  },
  track: {
    backgroundColor: "#E9EEF8",
    borderRadius: 999,
    height: 6,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    height: "100%",
  },
});
