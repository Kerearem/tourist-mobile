import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Screen } from "../../../components/ui/Screen";
import { OnboardingRoutes } from "../../../constants/routes";
import type { OnboardingStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "CityScreen">;

export function CityScreen({ navigation, route }: Props) {
  const [city, setCity] = useState("");
  const [error, setError] = useState("");

  const onContinue = () => {
    if (!city.trim()) {
      setError("Please enter your city.");
      return;
    }

    setError("");
    navigation.navigate(OnboardingRoutes.LocationPermissionScreen, {
      community: route.params.community,
      country: route.params.country,
      city: city.trim(),
    });
  };

  return (
    <Screen>
      <View style={styles.container}>
        <AppText style={styles.title}>City</AppText>
        <AppText muted style={styles.subtitle}>
          {route.params.country}
        </AppText>

        <AppInput onChangeText={setCity} placeholder="e.g. Berlin" value={city} />
        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <AppButton label="Continue" onPress={onContinue} />
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
    marginBottom: 8,
  },
  error: {
    color: "#DC2626",
  },
});
