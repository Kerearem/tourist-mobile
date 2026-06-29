import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { EventItem } from "../types";

type EventDetailOfferingsProps = {
  event: Pick<EventItem, "minAge" | "hasAlcohol" | "smokingAllowed" | "metadata">;
};

type OfferingItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

function buildOfferingItems(event: EventDetailOfferingsProps["event"]): OfferingItem[] {
  const items: OfferingItem[] = [];

  if (event.minAge === 18) {
    items.push({ key: "age", icon: "people-outline", label: "18 yaş ve üzeri" });
  } else if (event.minAge === 21) {
    items.push({ key: "age", icon: "people-outline", label: "21 yaş ve üzeri" });
  } else {
    items.push({ key: "age", icon: "people-outline", label: "Her yaşa uygun (16+)" });
  }

  if (event.hasAlcohol) {
    items.push({ key: "alcohol", icon: "wine-outline", label: "Alkol servisi var" });
  } else {
    items.push({ key: "alcohol", icon: "wine-outline", label: "Alkolsüz etkinlik" });
  }

  if (event.smokingAllowed) {
    items.push({ key: "smoking", icon: "cloud-outline", label: "Sigara içilebilir" });
  } else {
    items.push({ key: "smoking", icon: "ban-outline", label: "Sigara içilmez" });
  }

  if (event.metadata?.isPaid === true) {
    items.push({ key: "price", icon: "ticket-outline", label: "Ücretli" });
  } else {
    items.push({ key: "price", icon: "pricetag-outline", label: "Ücretsiz" });
  }

  return items;
}

function OfferingRow({ icon, label }: Omit<OfferingItem, "key">) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons color={theme.colors.textPrimary} name={icon} size={26} />
      </View>
      <AppText style={styles.label} variant="body">
        {label}
      </AppText>
    </View>
  );
}

export function EventDetailOfferings({ event }: EventDetailOfferingsProps) {
  const items = useMemo(() => buildOfferingItems(event), [event]);

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <OfferingRow icon={item.icon} key={item.key} label={item.label} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.lg,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.lg,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
  },
  label: {
    color: theme.colors.textPrimary,
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
  },
});
