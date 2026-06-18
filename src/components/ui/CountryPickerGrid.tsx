import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, useWindowDimensions } from "react-native";

import { AppInput } from "./AppInput";
import { AppText } from "./AppText";
import { CountryFlag } from "./CountryFlag";
import { filterCountries, getCountryLabel, type Country } from "../../constants/countries";
import { theme } from "../../constants/theme";
import { useLanguage } from "../../hooks/useLanguage";

type Props = {
  selectedCode?: string;
  onSelect: (code: string) => void;
};

export function CountryPickerGrid({ selectedCode, onSelect }: Props) {
  const { language } = useLanguage();
  const locale = language === "en" ? "en" : "tr";
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");

  const filteredCountries = useMemo(() => filterCountries(query, locale), [query, locale]);
  const columnGap = theme.spacing.sm;
  const cellWidth = (width - theme.spacing.lg * 2 - columnGap) / 2;

  const handleSelect = (country: Country) => {
    onSelect(country.code);
  };

  return (
    <>
      <AppInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setQuery}
        placeholder={locale === "en" ? "Search country" : "Ülke ara"}
        value={query}
      />

      <FlatList
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        data={filteredCountries}
        keyExtractor={(item) => item.code}
        keyboardShouldPersistTaps="handled"
        numColumns={2}
        renderItem={({ item }) => {
          const isSelected = selectedCode === item.code;
          return (
            <Pressable
              onPress={() => handleSelect(item)}
              style={[styles.cell, { width: cellWidth }, isSelected && styles.cellSelected]}
            >
              <CountryFlag code={item.code} height={32} width={48} />
              <AppText numberOfLines={2} style={[styles.cellLabel, isSelected && styles.cellLabelSelected]}>
                {getCountryLabel(item, locale)}
              </AppText>
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  row: {
    gap: theme.spacing.sm,
    justifyContent: "space-between",
  },
  cell: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    gap: theme.spacing.sm,
    justifyContent: "center",
    minHeight: 96,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  cellSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: theme.colors.primary,
  },
  cellLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  cellLabelSelected: {
    color: theme.colors.primary,
  },
});
