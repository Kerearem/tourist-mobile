import React, { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { AppInput } from "./AppInput";
import { AppText } from "./AppText";
import { theme } from "../../constants/theme";

type Props<T> = {
  items: T[];
  selectedKey?: string;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
  searchPlaceholder: string;
  emptyLabel: string;
  filterItems: (items: T[], query: string) => T[];
};

export function SearchSelectList<T>({
  items,
  selectedKey,
  getKey,
  getLabel,
  onSelect,
  searchPlaceholder,
  emptyLabel,
  filterItems,
}: Props<T>) {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => filterItems(items, query), [filterItems, items, query]);

  return (
    <View style={styles.container}>
      <AppInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setQuery}
        placeholder={searchPlaceholder}
        value={query}
      />

      <FlatList
        contentContainerStyle={filteredItems.length === 0 ? styles.emptyListContent : styles.listContent}
        data={filteredItems}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => getKey(item)}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <AppText muted style={styles.emptyText}>
              {emptyLabel}
            </AppText>
          </View>
        }
        renderItem={({ item }) => {
          const key = getKey(item);
          const isSelected = selectedKey === key;
          return (
            <Pressable
              onPress={() => onSelect(item)}
              style={[styles.row, isSelected && styles.rowSelected]}
            >
              <AppText style={[styles.rowLabel, isSelected && styles.rowLabelSelected]}>{getLabel(item)}</AppText>
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.md,
  },
  emptyListContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.md,
  },
  row: {
    borderBottomColor: theme.colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    paddingVertical: theme.spacing.sm,
  },
  rowSelected: {
    backgroundColor: "#EFF6FF",
  },
  rowLabel: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
  rowLabelSelected: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  emptyWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    textAlign: "center",
  },
});
