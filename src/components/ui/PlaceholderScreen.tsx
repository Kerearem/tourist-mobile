import React from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "./AppText";
import { Screen } from "./Screen";

type PlaceholderScreenProps = {
  title: string;
};

// Phase 1 helper only: replace with feature-owned screen layouts in later phases.
export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <Screen>
      <View style={styles.content}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText muted>Placeholder</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
});
