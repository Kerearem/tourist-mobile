import React from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";

type ProfileStatsRowProps = {
  helped?: number | null;
  events?: number | null;
  organized?: number | null;
  showOrganized?: boolean;
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.stat}>
    <AppText style={styles.value} variant="sectionTitle">
      {value}
    </AppText>
    <AppText variant="caption">{label}</AppText>
  </View>
);

export function ProfileStatsRow({ helped, events, organized, showOrganized = false }: ProfileStatsRowProps) {
  const items: Array<{ label: string; value: number }> = [];

  if (typeof helped === "number") {
    items.push({ label: "Helped", value: helped });
  }
  if (typeof events === "number") {
    items.push({ label: "Events", value: events });
  }
  if (showOrganized && typeof organized === "number") {
    items.push({ label: "Organized", value: organized });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <Stat label={item.label} value={item.value} />
        </React.Fragment>
      ))}
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
