import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { FlowProgressBar } from "../../../components/ui/FlowProgressBar";
import { Screen } from "../../../components/ui/Screen";
import { OnboardingRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import type { UserLanguage } from "../../../models/user";
import type { OnboardingStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "CityScreen">;
type LanguageOption = {
  code: string;
  label: string;
};

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "tr", label: "Turkish" },
  { code: "en", label: "English" },
  { code: "de", label: "German" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
];

export function CityScreen({ navigation, route }: Props) {
  const [languages, setLanguages] = useState<UserLanguage[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [error, setError] = useState("");

  const onContinue = () => {
    if (languages.length === 0 || languages.some((item) => !item.code || !item.level)) {
      setError("Select at least one spoken language.");
      return;
    }

    setError("");
    navigation.navigate(OnboardingRoutes.LocationPermissionScreen, {
      nationalityCountryCode: route.params.nationalityCountryCode,
      homeCommunity: route.params.homeCommunity,
      destinationCountryCode: route.params.destinationCountryCode,
      destinationCity: route.params.destinationCity,
      currentCity: route.params.currentCity,
      spokenLanguages: languages,
    });
  };

  const handleSelectLanguage = (option: LanguageOption) => {
    const exists = languages.some((item) => item.code === option.code);
    if (!exists) {
      setLanguages((prev) => [...prev, { code: option.code, level: "intermediate" }]);
    }
    setError("");
    setIsSelectorOpen(false);
  };

  const handleRemoveLanguage = (code: string) => {
    setLanguages((prev) => prev.filter((item) => item.code !== code));
  };

  return (
    <Screen>
      <View style={styles.container}>
        <FlowProgressBar currentStep={6} totalSteps={7} />
        <View style={styles.content}>
          <AppText style={styles.title}>Languages</AppText>
          <AppText muted style={styles.subtitle}>
            Select the languages you can speak.
          </AppText>

          <Pressable onPress={() => setIsSelectorOpen(true)} style={styles.selector}>
            <AppText style={styles.selectorText}>Choose language</AppText>
            <Ionicons color={theme.colors.muted} name="chevron-down" size={18} />
          </Pressable>

          {languages.length > 0 ? (
            <View style={styles.languageList}>
              {languages.map((language) => (
                <Pressable key={language.code} onPress={() => handleRemoveLanguage(language.code)} style={styles.languagePill}>
                  <AppText style={styles.languagePillText} variant="caption">
                    {language.code.toUpperCase()} ×
                  </AppText>
                </Pressable>
              ))}
            </View>
          ) : null}

          {error ? <AppText style={styles.error}>{error}</AppText> : null}

          <AppButton label="Continue" onPress={onContinue} />
        </View>
      </View>

      <Modal animationType="slide" onRequestClose={() => setIsSelectorOpen(false)} transparent visible={isSelectorOpen}>
        <Pressable onPress={() => setIsSelectorOpen(false)} style={styles.modalBackdrop}>
          <Pressable style={styles.sheet}>
            <AppText style={styles.sheetTitle}>Select language</AppText>
            <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false}>
              {LANGUAGE_OPTIONS.map((option) => (
                <Pressable key={option.code} onPress={() => handleSelectLanguage(option)} style={styles.sheetItem}>
                  <AppText style={styles.sheetItemText}>{option.label}</AppText>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  selector: {
    alignItems: "center",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: theme.spacing.md,
  },
  selectorText: {
    color: theme.colors.textPrimary,
  },
  languageList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  languagePill: {
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  languagePillText: {
    color: "#3730A3",
    fontWeight: "600",
  },
  modalBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.34)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "58%",
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: theme.spacing.md,
  },
  sheetList: {
    paddingBottom: theme.spacing.md,
  },
  sheetItem: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
  sheetItemText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  error: {
    color: "#DC2626",
  },
});
