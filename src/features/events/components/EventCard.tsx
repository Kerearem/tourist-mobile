import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { EventItem } from "../types";

type EventCardProps = {
  event: EventItem;
  onPress: () => void;
};

export function EventCard({ event, onPress }: EventCardProps) {
  const initials = event.host.displayName.slice(0, 2).toUpperCase();

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <Avatar initials={initials} size={38} uri={event.host.avatarUrl} />
        <View style={styles.headerText}>
          <AppText style={styles.title}>{event.title}</AppText>
          <AppText muted numberOfLines={1}>
            {event.city}, {event.countryCode}
          </AppText>
        </View>
      </View>
      <AppText muted numberOfLines={2}>
        {event.description}
      </AppText>
      <View style={styles.footer}>
        <AppText muted>{event.attendeeCount} attending</AppText>
        <AppText muted>{event.isUserAttending ? "Attending" : "Not attending"}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
    padding: 12,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
