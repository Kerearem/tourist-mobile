import React from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

type ProfileStatsRowProps = {
  helped: number;
  events: number;
  organized: number;
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.stat}>
    <AppText style={styles.value} variant="sectionTitle">
      {value}
    </AppText>
    <AppText variant="caption">{label}</AppText>
  </View>
);

export function ProfileStatsRow({ helped, events, organized }: ProfileStatsRowProps) {
  return (
    <View style={styles.row}>
      <Stat label="Helped" value={helped} />
      <View style={styles.divider} />
      <Stat label="Events" value={events} />
      <View style={styles.divider} />
      <Stat label="Organized" value={organized} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.xl,
  },
  stat: {
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.xs,
  },
  value: {
    textAlign: "center",
  },
  divider: {
    backgroundColor: theme.colors.border,
    height: 56,
    width: 1,
  },
});
