import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Screen } from "../../../components/ui/Screen";
import { OnboardingRoutes } from "../../../constants/routes";
import type { OnboardingStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "CountryScreen">;

export function CountryScreen({ navigation, route }: Props) {
  const [country, setCountry] = useState("");
  const [error, setError] = useState("");

  const onContinue = () => {
    if (!country.trim()) {
      setError("Please enter your current country.");
      return;
    }

    setError("");
    navigation.navigate(OnboardingRoutes.CityScreen, {
      community: route.params.community,
      country: country.trim(),
    });
  };

  return (
    <Screen>
      <View style={styles.container}>
        <AppText style={styles.title}>Country</AppText>
        <AppText muted style={styles.subtitle}>
          Community: {route.params.community}
        </AppText>

        <AppInput onChangeText={setCountry} placeholder="e.g. Germany" value={country} />
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
