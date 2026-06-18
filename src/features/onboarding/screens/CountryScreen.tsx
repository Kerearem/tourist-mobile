import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { CountryPickerGrid } from "../../../components/ui/CountryPickerGrid";
import { FlowProgressBar } from "../../../components/ui/FlowProgressBar";
import { SearchSelectList } from "../../../components/ui/SearchSelectList";
import { SIGNUP_FLOW_STEPS, SIGNUP_FLOW_TOTAL_STEPS } from "../../auth/constants/signupFlow";
import { Screen } from "../../../components/ui/Screen";
import { getCountryByCode, getCountryLabel } from "../../../constants/countries";
import {
  filterCityEntries,
  filterUsStates,
  formatUsDestinationCity,
  getCitiesForCountry,
  getCitiesForUsState,
  getUsStates,
  isUsCountry,
  type CityEntry,
  type UsStateEntry,
} from "../../../constants/cities";
import { theme } from "../../../constants/theme";
import { OnboardingRoutes } from "../../../constants/routes";
import { useLanguage } from "../../../hooks/useLanguage";
import type { OnboardingStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<OnboardingStackParamList, "CountryScreen">;
type SelectionPhase = "country" | "city";
type UsSubPhase = "state" | "city";

export function CountryScreen({ navigation, route }: Props) {
  const { language } = useLanguage();
  const locale = language === "en" ? "en" : "tr";
  const [selectionPhase, setSelectionPhase] = useState<SelectionPhase>("country");
  const [usSubPhase, setUsSubPhase] = useState<UsSubPhase>("state");
  const [currentCountryCode, setCurrentCountryCode] = useState("");
  const [selectedUsStateCode, setSelectedUsStateCode] = useState("");
  const [selectedCityName, setSelectedCityName] = useState("");
  const [errors, setErrors] = useState<{ currentCountryCode?: string; currentCity?: string }>({});

  const selectedCountry = useMemo(
    () => getCountryByCode(currentCountryCode),
    [currentCountryCode],
  );

  const selectedUsState = useMemo(
    () => getUsStates().find((state) => state.code === selectedUsStateCode) ?? null,
    [selectedUsStateCode],
  );

  const destinationCity = useMemo(() => {
    if (!selectedCityName) {
      return "";
    }
    if (isUsCountry(currentCountryCode) && selectedUsStateCode) {
      return formatUsDestinationCity(selectedCityName, selectedUsStateCode);
    }
    return selectedCityName;
  }, [currentCountryCode, selectedCityName, selectedUsStateCode]);

  const resetCitySelection = () => {
    setUsSubPhase("state");
    setSelectedUsStateCode("");
    setSelectedCityName("");
    setErrors((prev) => ({ ...prev, currentCity: undefined }));
  };

  const onCountryContinue = () => {
    if (!currentCountryCode || !selectedCountry) {
      setErrors({ currentCountryCode: locale === "en" ? "Please select current country." : "Lütfen yaşadığınız ülkeyi seçin." });
      return;
    }

    setErrors({});
    resetCitySelection();
    setSelectionPhase("city");
  };

  const onCityContinue = () => {
    if (!destinationCity) {
      setErrors({
        currentCity:
          locale === "en" ? "Please select your city from the list." : "Lütfen listeden şehrinizi seçin.",
      });
      return;
    }

    setErrors({});
    navigation.navigate(OnboardingRoutes.CityScreen, {
      nationalityCountryCode: route.params.nationalityCountryCode,
      homeCommunity: route.params.homeCommunity,
      destinationCountryCode: currentCountryCode,
      destinationCity,
      currentCity: destinationCity,
    });
  };

  const handleCountrySelect = (code: string) => {
    setCurrentCountryCode(code);
    setErrors((prev) => ({ ...prev, currentCountryCode: undefined }));
  };

  const handleUsStateSelect = (state: UsStateEntry) => {
    setSelectedUsStateCode(state.code);
    setSelectedCityName("");
    setUsSubPhase("city");
    setErrors((prev) => ({ ...prev, currentCity: undefined }));
  };

  const handleCitySelect = (city: CityEntry) => {
    setSelectedCityName(city.name);
    setErrors((prev) => ({ ...prev, currentCity: undefined }));
  };

  const renderCityStep = () => {
    if (!selectedCountry) {
      return null;
    }

    if (isUsCountry(currentCountryCode)) {
      if (usSubPhase === "state") {
        return (
          <SearchSelectList
            emptyLabel={locale === "en" ? "No states found." : "Eyalet bulunamadı."}
            filterItems={filterUsStates}
            getKey={(state) => state.code}
            getLabel={(state) => `${state.name} (${state.code})`}
            items={getUsStates()}
            onSelect={handleUsStateSelect}
            searchPlaceholder={locale === "en" ? "Search state" : "Eyalet ara"}
            selectedKey={selectedUsStateCode}
          />
        );
      }

      return (
        <>
          <Pressable
            onPress={() => {
              setUsSubPhase("state");
              setSelectedCityName("");
            }}
            style={styles.backLink}
          >
            <AppText style={styles.backLinkText}>
              {locale === "en"
                ? `← ${selectedUsState?.name ?? "Change state"}`
                : `← ${selectedUsState?.name ?? "Eyalet değiştir"}`}
            </AppText>
          </Pressable>

          <SearchSelectList
            emptyLabel={locale === "en" ? "No cities found." : "Şehir bulunamadı."}
            filterItems={filterCityEntries}
            getKey={(city) => city.name}
            getLabel={(city) => city.name}
            items={getCitiesForUsState(selectedUsStateCode)}
            onSelect={handleCitySelect}
            searchPlaceholder={locale === "en" ? "Search city" : "Şehir ara"}
            selectedKey={selectedCityName}
          />
        </>
      );
    }

    return (
      <SearchSelectList
        emptyLabel={locale === "en" ? "No cities found." : "Şehir bulunamadı."}
        filterItems={filterCityEntries}
        getKey={(city) => city.name}
        getLabel={(city) => city.name}
        items={getCitiesForCountry(currentCountryCode)}
        onSelect={handleCitySelect}
        searchPlaceholder={locale === "en" ? "Search city" : "Şehir ara"}
        selectedKey={selectedCityName}
      />
    );
  };

  return (
    <Screen contentContainerStyle={styles.screenContent}>
      <View style={styles.container}>
        <FlowProgressBar currentStep={SIGNUP_FLOW_STEPS.country} totalSteps={SIGNUP_FLOW_TOTAL_STEPS} />

        {selectionPhase === "country" ? (
          <>
            <AppText style={styles.title}>
              {locale === "en" ? "Current location" : "Yaşadığınız yer"}
            </AppText>
            <AppText muted style={styles.subtitle}>
              {locale === "en" ? "Select the country you live in." : "Yaşadığınız ülkeyi seçin."}
            </AppText>

            <CountryPickerGrid onSelect={handleCountrySelect} selectedCode={currentCountryCode} />

            {errors.currentCountryCode ? <AppText style={styles.error}>{errors.currentCountryCode}</AppText> : null}

            <AppButton label={locale === "en" ? "Continue" : "Devam"} onPress={onCountryContinue} />
          </>
        ) : (
          <>
            <Pressable
              onPress={() => {
                setSelectionPhase("country");
                resetCitySelection();
              }}
              style={styles.backLink}
            >
              <AppText style={styles.backLinkText}>
                {locale === "en"
                  ? `← ${selectedCountry ? getCountryLabel(selectedCountry, locale) : "Change country"}`
                  : `← ${selectedCountry ? getCountryLabel(selectedCountry, locale) : "Ülke değiştir"}`}
              </AppText>
            </Pressable>

            <AppText style={styles.title}>
              {isUsCountry(currentCountryCode) && usSubPhase === "state"
                ? locale === "en"
                  ? "Select state"
                  : "Eyalet seçin"
                : locale === "en"
                  ? "Select city"
                  : "Şehir seçin"}
            </AppText>

            {destinationCity ? (
              <AppText muted style={styles.subtitle}>
                {locale === "en" ? "Selected:" : "Seçilen:"} {destinationCity}
              </AppText>
            ) : null}

            {renderCityStep()}

            {errors.currentCity ? <AppText style={styles.error}>{errors.currentCity}</AppText> : null}

            <AppButton label={locale === "en" ? "Continue" : "Devam"} onPress={onCityContinue} />
          </>
        )}
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
  backLink: {
    alignSelf: "flex-start",
    paddingVertical: theme.spacing.xs,
  },
  backLinkText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  error: {
    color: "#DC2626",
  },
});
