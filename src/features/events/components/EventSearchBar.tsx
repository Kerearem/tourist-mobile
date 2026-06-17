import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "../../../constants/theme";

type EventSearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export function EventSearchBar({ value, onChangeText }: EventSearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons color={theme.colors.muted} name="search" size={20} />
      <TextInput
        onChangeText={onChangeText}
        placeholder="Search events..."
        placeholderTextColor={theme.colors.muted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#EEF1F5",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 46,
    paddingHorizontal: theme.spacing.md,
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    flex: 1,
  },
});
