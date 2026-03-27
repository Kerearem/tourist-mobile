import React from "react";
import { StyleSheet, View } from "react-native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { HelpRequest } from "../types";

type HelpRequestCardProps = {
  request: HelpRequest;
  onOpen: () => void;
  onHelp: () => void;
};

export function HelpRequestCard({ request, onOpen, onHelp }: HelpRequestCardProps) {
  const initials = request.author.displayName.slice(0, 2).toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar initials={initials} size={38} uri={request.author.avatarUrl} />
        <View style={styles.headerText}>
          <AppText style={styles.author}>{request.author.displayName}</AppText>
          <AppText muted style={styles.meta}>
            {request.community} - {request.city}, {request.countryCode}
          </AppText>
        </View>
      </View>

      <AppText style={styles.title}>{request.title}</AppText>
      <AppText muted numberOfLines={3}>
        {request.description}
      </AppText>

      <View style={styles.footer}>
        <AppText muted>{request.responsesCount} responders</AppText>
        <AppText muted>Status: {request.status}</AppText>
      </View>

      <View style={styles.actions}>
        <AppButton containerStyle={styles.secondaryButton} label="View" onPress={onOpen} />
        <AppButton label={request.viewerState.hasResponded ? "Responded" : "I Can Help"} onPress={onHelp} />
      </View>
    </View>
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
  author: {
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
    marginTop: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  secondaryButton: {
    backgroundColor: "#6B7280",
    flex: 1,
  },
});
