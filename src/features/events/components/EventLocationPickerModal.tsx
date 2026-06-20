import React, { useMemo, useState } from "react";
import { Modal, Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { CountryPickerGrid } from "../../../components/ui/CountryPickerGrid";
import { SearchSelectList } from "../../../components/ui/SearchSelectList";
import { getCountryByCode, getCountryLabel } from "../../../constants/countries";
import {
  filterCityEntries,
  filterUsStates,
  getCitiesForCountry,
  getCitiesForUsState,
  getUsStates,
  isUsCountry,
  type CityEntry,
  type UsStateEntry,
} from "../../../constants/cities";
import { theme } from "../../../constants/theme";

type Props = {
  visible: boolean;
  countryCode: string;
  city: string;
  onClose: () => void;
  onConfirm: (countryCode: string, city: string) => void;
};

type Phase = "country" | "city" | "us-state";

export function EventLocationPickerModal({ visible, countryCode, city, onClose, onConfirm }: Props) {
  const [phase, setPhase] = useState<Phase>("country");
  const [draftCountryCode, setDraftCountryCode] = useState(countryCode);
  const [draftCity, setDraftCity] = useState(city);
  const [draftUsStateCode, setDraftUsStateCode] = useState("");

  const selectedCountry = useMemo(() => getCountryByCode(draftCountryCode), [draftCountryCode]);

  const resetDraft = () => {
    setDraftCountryCode(countryCode);
    setDraftCity(city);
    setDraftUsStateCode("");
    setPhase("country");
  };

  const handleClose = () => {
    resetDraft();
    onClose();
  };

  const handleCountrySelect = (code: string) => {
    setDraftCountryCode(code);
    setDraftCity("");
    setDraftUsStateCode("");
    if (isUsCountry(code)) {
      setPhase("us-state");
      return;
    }
    setPhase("city");
  };

  const handleUsStateSelect = (state: UsStateEntry) => {
    setDraftUsStateCode(state.code);
    setDraftCity("");
    setPhase("city");
  };

  const handleCitySelect = (entry: CityEntry) => {
    if (isUsCountry(draftCountryCode) && draftUsStateCode) {
      setDraftCity(`${entry.name}, ${draftUsStateCode}`);
    } else {
      setDraftCity(entry.name);
    }
  };

  const handleConfirm = () => {
    if (!draftCountryCode || !draftCity.trim()) {
      return;
    }
    onConfirm(draftCountryCode, draftCity.trim());
    resetDraft();
    onClose();
  };

  return (
    <Modal animationType="slide" onRequestClose={handleClose} visible={visible}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.iconButton}>
            <Ionicons color={theme.colors.textPrimary} name="close" size={24} />
          </Pressable>
          <AppText variant="sectionTitle">Ülke ve Şehir</AppText>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.body}>
          {phase === "country" ? (
            <CountryPickerGrid onSelect={handleCountrySelect} selectedCode={draftCountryCode} />
          ) : null}

          {phase === "us-state" ? (
            <>
              <Pressable onPress={() => setPhase("country")} style={styles.backLink}>
                <AppText style={styles.backLinkText}>← Ülke değiştir</AppText>
              </Pressable>
              <SearchSelectList
                emptyLabel="Eyalet bulunamadı."
                filterItems={filterUsStates}
                getKey={(state) => state.code}
                getLabel={(state) => `${state.name} (${state.code})`}
                items={getUsStates()}
                onSelect={handleUsStateSelect}
                searchPlaceholder="Eyalet ara"
                selectedKey={draftUsStateCode}
              />
            </>
          ) : null}

          {phase === "city" ? (
            <>
              <Pressable
                onPress={() => {
                  if (isUsCountry(draftCountryCode)) {
                    setPhase("us-state");
                    return;
                  }
                  setPhase("country");
                }}
                style={styles.backLink}
              >
                <AppText style={styles.backLinkText}>
                  ← {selectedCountry ? getCountryLabel(selectedCountry, "tr") : "Ülke değiştir"}
                </AppText>
              </Pressable>
              <SearchSelectList
                emptyLabel="Şehir bulunamadı."
                filterItems={filterCityEntries}
                getKey={(entry) => entry.name}
                getLabel={(entry) => entry.name}
                items={
                  isUsCountry(draftCountryCode) && draftUsStateCode
                    ? getCitiesForUsState(draftUsStateCode)
                    : getCitiesForCountry(draftCountryCode)
                }
                onSelect={handleCitySelect}
                searchPlaceholder="Şehir ara"
                selectedKey={draftCity.split(",")[0]?.trim()}
              />
            </>
          ) : null}
        </View>

        <View style={styles.footer}>
          <AppButton
            disabled={!draftCountryCode || !draftCity.trim()}
            label="Seçimi Onayla"
            onPress={handleConfirm}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  body: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  backLink: {
    marginBottom: theme.spacing.sm,
  },
  backLinkText: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  footer: {
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    padding: theme.spacing.lg,
  },
});
