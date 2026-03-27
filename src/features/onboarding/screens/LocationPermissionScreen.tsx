import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { Screen } from "../../../components/ui/Screen";
import { useAuth } from "../../../hooks/useAuth";
import type { OnboardingStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "LocationPermissionScreen">;

export function LocationPermissionScreen({ route }: Props) {
  const { completeOnboarding } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finishOnboarding = async () => {
    setIsSubmitting(true);
    await completeOnboarding({
      community: route.params.community,
      country: route.params.country,
      city: route.params.city,
    });
    setIsSubmitting(false);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <AppText style={styles.title}>Location Permission</AppText>
        <AppText muted style={styles.subtitle}>
          City: {route.params.city}
        </AppText>
        <AppText muted style={styles.subtitle}>
          Community: {route.params.community}
        </AppText>
        <AppText muted style={styles.description}>
          Allowing location helps us recommend nearby communities and events.
        </AppText>

        <AppButton label={isSubmitting ? "Finishing..." : "Allow Location"} onPress={finishOnboarding} />
        <AppButton containerStyle={styles.secondaryButton} label="Skip for Now" onPress={finishOnboarding} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    marginBottom: 2,
  },
  description: {
    marginBottom: 8,
  },
  secondaryButton: {
    backgroundColor: "#6B7280",
  },
});
