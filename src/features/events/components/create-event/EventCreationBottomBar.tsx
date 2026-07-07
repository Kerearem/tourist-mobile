import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "../../../../components/ui/AppButton";
import { theme } from "../../../../constants/theme";
import type { EventCreationStep } from "../../types/eventCreation";

type EventCreationBottomBarProps = {
  currentStep: EventCreationStep;
  canProceed: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
};

export function EventCreationBottomBar({
  currentStep,
  canProceed,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
}: EventCreationBottomBarProps) {
  const insets = useSafeAreaInsets();
  const isLastStep = currentStep === 5;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
      <AppButton
        containerStyle={styles.backButton}
        disabled={isSubmitting}
        label="Geri"
        onPress={onBack}
        variant="secondary"
      />
      <AppButton
        containerStyle={styles.primaryButton}
        disabled={!canProceed || isSubmitting}
        label={isLastStep ? (isSubmitting ? "Gönderiliyor..." : "İncelemeye Gönder") : "Devam"}
        loading={isSubmitting && isLastStep}
        onPress={isLastStep ? onSubmit : onNext}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  backButton: {
    flex: 1,
  },
  primaryButton: {
    flex: 2,
  },
});
