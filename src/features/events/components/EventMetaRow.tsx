import React from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

type EventMetaRowProps = {
  label: string;
  value: string;
};

export function EventMetaRow({ label, value }: EventMetaRowProps) {
  return (
    <View style={styles.row}>
      <AppText style={styles.label} variant="caption">
        {label}
      </AppText>
      <AppText style={styles.value} variant="body">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "flex-start",
    borderBottomColor: theme.colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
  },
  label: {
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  value: {
    flex: 1,
    fontWeight: "600",
    textAlign: "right",
  },
});
