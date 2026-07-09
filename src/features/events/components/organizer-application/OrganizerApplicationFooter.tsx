import React from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "../../../../components/ui/AppButton";
import { theme } from "../../../../constants/theme";

type Props = {
  showBack: boolean;
  backLabel?: string;
  onBack?: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
};

export function OrganizerApplicationFooter({
  showBack,
  backLabel = "Geri",
  onBack,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  primaryLoading = false,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
}: Props) {
  return (
    <View style={styles.container}>
      {showBack && onBack ? (
        <AppButton disabled={primaryLoading} label={backLabel} onPress={onBack} variant="secondary" />
      ) : null}
      {secondaryLabel && onSecondary ? (
        <AppButton
          disabled={secondaryDisabled || primaryLoading}
          label={secondaryLabel}
          onPress={onSecondary}
          variant="secondary"
        />
      ) : null}
      <AppButton
        disabled={primaryDisabled || primaryLoading}
        label={primaryLoading ? "İşleniyor..." : primaryLabel}
        onPress={onPrimary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
  },
});
