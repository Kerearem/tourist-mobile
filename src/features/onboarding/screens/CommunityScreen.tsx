import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { CountryPickerGrid } from "../../../components/ui/CountryPickerGrid";
import { FlowProgressBar } from "../../../components/ui/FlowProgressBar";
import { SIGNUP_FLOW_STEPS, SIGNUP_FLOW_TOTAL_STEPS } from "../../auth/constants/signupFlow";
import { Screen } from "../../../components/ui/Screen";
import { getCountryByCode } from "../../../constants/countries";
import { OnboardingRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useLanguage } from "../../../hooks/useLanguage";
import type { OnboardingStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "CommunityScreen">;

export function CommunityScreen({ navigation }: Props) {
  const { language } = useLanguage();
  const locale = language === "en" ? "en" : "tr";
  const [nationalityCountryCode, setNationalityCountryCode] = useState("");
  const [errors, setErrors] = useState<{ nationalityCountryCode?: string }>({});

  const onContinue = () => {
    const nextErrors: { nationalityCountryCode?: string } = {};
    const cleanNationality = nationalityCountryCode.trim().toUpperCase();
    const country = getCountryByCode(cleanNationality);

    if (!cleanNationality || !country) {
      nextErrors.nationalityCountryCode =
        locale === "en" ? "Please select your nationality country." : "Lütfen uyruk ülkenizi seçin.";
    }

    if (nextErrors.nationalityCountryCode) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    navigation.navigate(OnboardingRoutes.CountryScreen, {
      nationalityCountryCode: cleanNationality,
      homeCommunity: country?.homeCommunity ?? "Other",
    });
  };

  return (
    <Screen contentContainerStyle={styles.screenContent}>
      <View style={styles.container}>
        <FlowProgressBar currentStep={SIGNUP_FLOW_STEPS.community} totalSteps={SIGNUP_FLOW_TOTAL_STEPS} />

        <AppText style={styles.title}>{locale === "en" ? "Identity" : "Kimlik"}</AppText>
        <AppText muted style={styles.subtitle}>
          {locale === "en" ? "Select your nationality." : "Uyruğunuzu seçin."}
        </AppText>

        <CountryPickerGrid
          onSelect={(code) => {
            setNationalityCountryCode(code);
            setErrors((prev) => ({ ...prev, nationalityCountryCode: undefined }));
          }}
          selectedCode={nationalityCountryCode}
        />

        {errors.nationalityCountryCode ? <AppText style={styles.error}>{errors.nationalityCountryCode}</AppText> : null}

        <AppButton label={locale === "en" ? "Continue" : "Devam"} onPress={onContinue} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: theme.spacing.md,
  },
  container: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    marginBottom: theme.spacing.xs,
  },
  error: {
    color: "#DC2626",
  },
});
