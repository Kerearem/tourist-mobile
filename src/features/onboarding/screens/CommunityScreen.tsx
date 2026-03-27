import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Screen } from "../../../components/ui/Screen";
import { OnboardingRoutes } from "../../../constants/routes";
import type { OnboardingStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "CommunityScreen">;

export function CommunityScreen({ navigation }: Props) {
  const [community, setCommunity] = useState("");
  const [error, setError] = useState("");

  const onContinue = () => {
    if (!community.trim()) {
      setError("Please select your community.");
      return;
    }

    setError("");
    navigation.navigate(OnboardingRoutes.CountryScreen, { community: community.trim() });
  };

  return (
    <Screen>
      <View style={styles.container}>
        <AppText style={styles.title}>Community</AppText>
        <AppText muted style={styles.subtitle}>
          Which home-country community do you identify with?
        </AppText>

        <AppInput onChangeText={setCommunity} placeholder="e.g. Turkish Community" value={community} />
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
