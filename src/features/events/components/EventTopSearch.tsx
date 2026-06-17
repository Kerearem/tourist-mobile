import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

type EventTopSearchProps = {
  value: string;
  onChangeText: (value: string) => void;
  locationLabel: string;
};

export function EventTopSearch({ value, onChangeText, locationLabel }: EventTopSearchProps) {
  const inputRef = useRef<TextInput>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const openSearch = () => {
    setIsSearchActive(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  return (
    <Pressable onPress={openSearch} style={styles.searchPill}>
      <Ionicons color={theme.colors.textPrimary} name="search" size={22} />
      <View style={styles.textBlock}>
        {isSearchActive ? (
          <TextInput
            onBlur={() => setIsSearchActive(false)}
            onChangeText={onChangeText}
            onFocus={() => setIsSearchActive(true)}
            placeholder="Search events..."
            placeholderTextColor="#9CA3AF"
            ref={inputRef}
            style={styles.searchInput}
            value={value}
          />
        ) : (
          <>
            <AppText style={styles.title} variant="label">
              Where to?
            </AppText>
            <AppText style={styles.subtitle} variant="caption">
              {locationLabel}
            </AppText>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchPill: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E8ECF1",
    borderRadius: 32,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    minHeight: 64,
    paddingHorizontal: theme.spacing.lg,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 18,
  },
  subtitle: {
    color: "#6B7280",
    marginTop: 1,
  },
  searchInput: {
    color: theme.colors.textPrimary,
    ...theme.typography.body,
    fontSize: 18,
    fontWeight: "500",
    minHeight: 30,
    paddingVertical: 0,
  },
});
