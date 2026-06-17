import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { FlowProgressBar } from "../../../components/ui/FlowProgressBar";
import { Screen } from "../../../components/ui/Screen";
import { theme } from "../../../constants/theme";
import { OnboardingRoutes } from "../../../constants/routes";
import type { OnboardingStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "CountryScreen">;
type SelectorMode = "country" | "city" | null;

const COUNTRY_CITY_OPTIONS = [
  { code: "DE", label: "Germany", cities: ["Berlin", "Munich", "Hamburg", "Cologne", "Frankfurt"] },
  { code: "GB", label: "United Kingdom", cities: ["London", "Manchester", "Birmingham", "Leeds", "Bristol"] },
  { code: "FR", label: "France", cities: ["Paris", "Lyon", "Marseille", "Toulouse", "Nice"] },
  { code: "NL", label: "Netherlands", cities: ["Amsterdam", "Rotterdam", "Utrecht", "The Hague", "Eindhoven"] },
  { code: "ES", label: "Spain", cities: ["Madrid", "Barcelona", "Valencia", "Seville", "Malaga"] },
] as const;

export function CountryScreen({ navigation, route }: Props) {
  const [currentCountryCode, setCurrentCountryCode] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [activeSelector, setActiveSelector] = useState<SelectorMode>(null);
  const [errors, setErrors] = useState<{ currentCountryCode?: string; currentCity?: string }>({});

  const selectedCountry = useMemo(
    () => COUNTRY_CITY_OPTIONS.find((option) => option.code === currentCountryCode) ?? null,
    [currentCountryCode],
  );

  const onContinue = () => {
    const cleanCurrentCity = currentCity.trim();
    const nextErrors: { currentCountryCode?: string; currentCity?: string } = {};

    if (!currentCountryCode) {
      nextErrors.currentCountryCode = "Please select current country.";
    }
    if (cleanCurrentCity.length < 2) {
      nextErrors.currentCity = "Please select current city.";
    }

    if (nextErrors.currentCountryCode || nextErrors.currentCity) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    navigation.navigate(OnboardingRoutes.CityScreen, {
      nationalityCountryCode: route.params.nationalityCountryCode,
      homeCommunity: route.params.homeCommunity,
      // Keep existing contract keys for now; map from current location selections.
      destinationCountryCode: currentCountryCode,
      destinationCity: cleanCurrentCity,
      currentCity: cleanCurrentCity,
    });
  };

  const handleSelectCountry = (code: string) => {
    setCurrentCountryCode(code);
    setCurrentCity("");
    setErrors((prev) => ({ ...prev, currentCountryCode: undefined, currentCity: undefined }));
    setActiveSelector(null);
  };

  const handleSelectCity = (city: string) => {
    setCurrentCity(city);
    setErrors((prev) => ({ ...prev, currentCity: undefined }));
    setActiveSelector(null);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <FlowProgressBar currentStep={5} totalSteps={7} />
        <View style={styles.content}>
          <AppText style={styles.title}>Current location</AppText>

          <AppText style={styles.label}>Current country</AppText>
          <Pressable onPress={() => setActiveSelector("country")} style={styles.selector}>
            <AppText muted={!selectedCountry} style={styles.selectorValue}>
              {selectedCountry ? `${selectedCountry.label} (${selectedCountry.code})` : "Select current country"}
            </AppText>
            <Ionicons color={theme.colors.muted} name="chevron-down" size={18} />
          </Pressable>
          {errors.currentCountryCode ? <AppText style={styles.error}>{errors.currentCountryCode}</AppText> : null}

          {selectedCountry ? (
            <>
              <AppText style={styles.label}>Current city</AppText>
              <Pressable onPress={() => setActiveSelector("city")} style={styles.selector}>
                <AppText muted={!currentCity} style={styles.selectorValue}>
                  {currentCity || "Select current city"}
                </AppText>
                <Ionicons color={theme.colors.muted} name="chevron-down" size={18} />
              </Pressable>
              {errors.currentCity ? <AppText style={styles.error}>{errors.currentCity}</AppText> : null}
            </>
          ) : null}

          <AppButton label="Continue" onPress={onContinue} />
        </View>
      </View>

      <Modal animationType="slide" onRequestClose={() => setActiveSelector(null)} transparent visible={activeSelector !== null}>
        <Pressable onPress={() => setActiveSelector(null)} style={styles.modalBackdrop}>
          <Pressable style={styles.sheet}>
            <AppText style={styles.sheetTitle}>
              {activeSelector === "country" ? "Select current country" : "Select current city"}
            </AppText>
            <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false}>
              {activeSelector === "country"
                ? COUNTRY_CITY_OPTIONS.map((option) => (
                    <Pressable key={option.code} onPress={() => handleSelectCountry(option.code)} style={styles.sheetItem}>
                      <AppText style={styles.sheetItemText}>{`${option.label} (${option.code})`}</AppText>
                    </Pressable>
                  ))
                : selectedCountry?.cities.map((city) => (
                    <Pressable key={city} onPress={() => handleSelectCity(city)} style={styles.sheetItem}>
                      <AppText style={styles.sheetItemText}>{city}</AppText>
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
  selectorDisabled: {
    opacity: 0.6,
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
