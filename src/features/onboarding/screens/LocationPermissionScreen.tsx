import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { FlowProgressBar } from "../../../components/ui/FlowProgressBar";
import { SIGNUP_FLOW_STEPS, SIGNUP_FLOW_TOTAL_STEPS } from "../../auth/constants/signupFlow";
import { Screen } from "../../../components/ui/Screen";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { RelocationReason } from "../../../models/user";
import type { OnboardingStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "LocationPermissionScreen">;

export function LocationPermissionScreen({ route }: Props) {
  const { completeOnboarding } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [relocationReason, setRelocationReason] = useState<RelocationReason | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState("");

  const reasons: Array<{ value: RelocationReason; label: string }> = [
    { value: "study", label: "Study" },
    { value: "work", label: "Work" },
    { value: "travel", label: "Travel" },
    { value: "family", label: "Family" },
    { value: "other", label: "Other" },
  ];
  const interestOptions = ["Food", "Networking", "Sports", "Culture", "Tech", "Outdoors", "Gaming", "Wellness"];

  const toggleInterest = (value: string) => {
    setInterests((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const finishOnboarding = async () => {
    if (!relocationReason) {
      setError("Choose your relocation reason.");
      return;
    }
    if (interests.length === 0) {
      setError("Select at least one interest.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await completeOnboarding({
        nationalityCountryCode: route.params.nationalityCountryCode,
        homeCommunity: route.params.homeCommunity,
        destinationCountryCode: route.params.destinationCountryCode,
        destinationCity: route.params.destinationCity,
        currentCity: route.params.currentCity,
        spokenLanguages: route.params.spokenLanguages,
        relocationReason,
        interests,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not complete onboarding.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <FlowProgressBar currentStep={SIGNUP_FLOW_STEPS.city} totalSteps={SIGNUP_FLOW_TOTAL_STEPS} />
        <View style={styles.content}>
          <AppText style={styles.title}>Final details</AppText>
          <AppText muted style={styles.subtitle}>
            One final step to personalize your Tourist experience.
          </AppText>

          <View style={styles.section}>
            <AppText style={styles.sectionTitle} variant="label">
              Relocation reason
            </AppText>
            <View style={styles.chipsWrap}>
              {reasons.map((reason) => {
                const active = relocationReason === reason.value;
                return (
                  <Pressable key={reason.value} onPress={() => setRelocationReason(reason.value)} style={[styles.chip, active && styles.chipActive]}>
                    <AppText style={[styles.chipText, active && styles.chipTextActive]} variant="caption">
                      {reason.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <AppText style={styles.sectionTitle} variant="label">
              Interests
            </AppText>
            <View style={styles.chipsWrap}>
              {interestOptions.map((interest) => {
                const active = interests.includes(interest);
                return (
                  <Pressable key={interest} onPress={() => toggleInterest(interest)} style={[styles.chip, active && styles.chipActive]}>
                    <AppText style={[styles.chipText, active && styles.chipTextActive]} variant="caption">
                      {interest}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error ? <AppText style={styles.error}>{error}</AppText> : null}

          <AppButton label={isSubmitting ? "Finishing..." : "Complete profile"} onPress={finishOnboarding} />
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
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  chip: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  chipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  chipText: {
    color: "#4B5563",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  error: {
    color: "#DC2626",
  },
});
