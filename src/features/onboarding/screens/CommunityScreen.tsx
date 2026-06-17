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
import type { OnboardingStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "CommunityScreen">;
type SelectorMode = "nationality" | null;

const NATIONALITY_OPTIONS = [
  { code: "TR", label: "Turkey", community: "Turkish" },
  { code: "GB", label: "United Kingdom", community: "British" },
  { code: "DE", label: "Germany", community: "German" },
  { code: "FR", label: "France", community: "French" },
  { code: "ES", label: "Spain", community: "Spanish" },
] as const;

export function CommunityScreen({ navigation }: Props) {
  const [nationalityCountryCode, setNationalityCountryCode] = useState("");
  const [activeSelector, setActiveSelector] = useState<SelectorMode>(null);
  const [errors, setErrors] = useState<{ nationalityCountryCode?: string }>({});

  const onContinue = () => {
    const nextErrors: { nationalityCountryCode?: string } = {};
    const cleanNationality = nationalityCountryCode.trim().toUpperCase();
    const selectedNationality = NATIONALITY_OPTIONS.find((option) => option.code === cleanNationality) ?? null;

    if (!cleanNationality) {
      nextErrors.nationalityCountryCode = "Please enter nationality country code.";
    }

    if (nextErrors.nationalityCountryCode) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    navigation.navigate(OnboardingRoutes.CountryScreen, {
      nationalityCountryCode: cleanNationality,
      homeCommunity: selectedNationality?.community ?? "Other",
    });
  };

  return (
    <Screen>
      <View style={styles.container}>
        <FlowProgressBar currentStep={4} totalSteps={7} />
        <View style={styles.content}>
          <AppText style={styles.title}>Identity</AppText>
          <AppText muted style={styles.subtitle}>
            Tell us your nationality.
          </AppText>

          <AppText style={styles.label}>Nationality</AppText>
          <Pressable onPress={() => setActiveSelector("nationality")} style={styles.selector}>
            <AppText muted={!nationalityCountryCode} style={styles.selectorValue}>
              {nationalityCountryCode || "Select nationality country"}
            </AppText>
            <Ionicons color={theme.colors.muted} name="chevron-down" size={18} />
          </Pressable>
          {errors.nationalityCountryCode ? <AppText style={styles.error}>{errors.nationalityCountryCode}</AppText> : null}

          <AppButton label="Continue" onPress={onContinue} />
        </View>
      </View>

      <Modal animationType="slide" onRequestClose={() => setActiveSelector(null)} transparent visible={activeSelector !== null}>
        <Pressable onPress={() => setActiveSelector(null)} style={styles.modalBackdrop}>
          <Pressable style={styles.sheet}>
            <AppText style={styles.sheetTitle}>Select nationality</AppText>
            <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false}>
              {NATIONALITY_OPTIONS.map((option) => (
                <Pressable
                  key={option.code}
                  onPress={() => {
                    setNationalityCountryCode(option.code);
                    setErrors((prev) => ({ ...prev, nationalityCountryCode: undefined }));
                    setActiveSelector(null);
                  }}
                  style={styles.sheetItem}
                >
                  <AppText style={styles.sheetItemText}>{`${option.label} (${option.code})`}</AppText>
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
  label: {
    fontSize: 14,
    fontWeight: "600",
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
  selectorValue: {
    color: theme.colors.textPrimary,
    flex: 1,
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
