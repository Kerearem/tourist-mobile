import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { ConversationThread } from "../types";

type ConversationListItemProps = {
  conversation: ConversationThread;
  viewerId: string;
  onPress: () => void;
};

const getTitle = (conversation: ConversationThread, viewerId: string) => {
  if (conversation.title) {
    return conversation.title;
  }

  const otherParticipants = conversation.participants.filter((item) => item.id !== viewerId);
  if (otherParticipants.length === 0) {
    return "Conversation";
  }

  return otherParticipants.map((item) => item.displayName).join(", ");
};

export function ConversationListItem({ conversation, viewerId, onPress }: ConversationListItemProps) {
  const title = getTitle(conversation, viewerId);
  const firstOther = conversation.participants.find((item) => item.id !== viewerId);
  const initials = (firstOther?.displayName || title).slice(0, 2).toUpperCase();

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Avatar initials={initials} size={42} uri={firstOther?.avatarUrl} />
      <View style={styles.textCol}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText muted numberOfLines={1}>
          {conversation.lastMessagePreview || "No messages yet"}
        </AppText>
      </View>
      {(conversation.unreadCount ?? 0) > 0 ? (
        <View style={styles.unreadBadge}>
          <AppText style={styles.unreadText}>{conversation.unreadCount}</AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 10,
    padding: 12,
  },
  textCol: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontWeight: "700",
    marginBottom: 4,
  },
  unreadBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
