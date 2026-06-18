import React from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { FlowProgressBar } from "../../../components/ui/FlowProgressBar";
import { Screen } from "../../../components/ui/Screen";
import { SIGNUP_FLOW_TOTAL_STEPS } from "../constants/signupFlow";

type Props = {
  currentStep: number;
  title: string;
  subtitle?: string;
  error?: string;
  showBack?: boolean;
  backLabel?: string;
  onBack?: () => void;
  primaryLabel: string;
  onPrimaryPress: () => void;
  primaryLoading?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export function SignupFlowLayout({
  currentStep,
  title,
  subtitle,
  error,
  showBack = false,
  backLabel = "Back",
  onBack,
  primaryLabel,
  onPrimaryPress,
  primaryLoading = false,
  footer,
  children,
}: Props) {
  return (
    <Screen>
      <View style={styles.container}>
        <FlowProgressBar currentStep={currentStep} totalSteps={SIGNUP_FLOW_TOTAL_STEPS} />
        <View style={styles.content}>
          <AppText style={styles.title}>{title}</AppText>
          {subtitle ? (
            <AppText muted style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}

          {children}

          {error ? <AppText style={styles.error}>{error}</AppText> : null}

          <View style={styles.actions}>
            {showBack && onBack ? (
              <AppButton containerStyle={styles.backButton} label={backLabel} onPress={onBack} variant="secondary" />
            ) : null}
            <AppButton label={primaryLabel} loading={primaryLoading} onPress={onPrimaryPress} />
          </View>

          {footer}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    marginBottom: 8,
  },
  error: {
    color: "#DC2626",
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  backButton: {
    backgroundColor: "#FFFFFF",
  },
});
