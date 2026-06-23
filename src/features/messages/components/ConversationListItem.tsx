import React, { useRef } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { theme } from "../../../constants/theme";
import type { ConversationThread } from "../types";

type ConversationListItemProps = {
  conversation: ConversationThread;
  viewerId: string;
  isOnline?: boolean;
  isMuted?: boolean;
  onPress: () => void;
  onMute?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
};

const getTitle = (conversation: ConversationThread, viewerId: string) => {
  if (conversation.metadata?.isSystemInbox === "true") {
    return "Tourist";
  }

  if (conversation.title) {
    return conversation.title;
  }

  const otherParticipants = conversation.participants.filter((item) => item.id !== viewerId);
  if (otherParticipants.length === 0) {
    return "Conversation";
  }

  return otherParticipants.map((item) => item.displayName).join(", ");
};

const formatTime = (iso?: string) => {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const avatarColors = ["#E0F2FE", "#FCE7F3", "#EDE9FE", "#DCFCE7"];
const SWIPE_ACTION_WIDTH = 62;
const MAX_SWIPE_LEFT = SWIPE_ACTION_WIDTH * 2 + theme.spacing.sm;
const MAX_SWIPE_RIGHT = SWIPE_ACTION_WIDTH + theme.spacing.sm;

export function ConversationListItem({
  conversation,
  viewerId,
  isOnline = false,
  isMuted = false,
  onPress,
  onMute,
  onDelete,
  onArchive,
}: ConversationListItemProps) {
  const isGroup = conversation.type === "group";
  const isSystemInbox = conversation.metadata?.isSystemInbox === "true";
  const title = getTitle(conversation, viewerId);
  const firstOther = conversation.participants.find((item) => item.id !== viewerId);
  const initials = isGroup ? "GR" : isSystemInbox ? "T" : (firstOther?.displayName || title).slice(0, 2).toUpperCase();
  const time = formatTime(conversation.lastMessageAt);
  const unreadCount = conversation.unreadCount ?? 0;
  const avatarColor = isGroup ? "#DBEAFE" : isSystemInbox ? "#E0E7FF" : avatarColors[Math.abs(title.length) % avatarColors.length];
  const memberCount = conversation.metadata?.memberCount ?? String(conversation.participants.length);
  const isArchivedGroup = conversation.metadata?.isArchived === "true";
  const previewText =
    conversation.lastMessagePreview ||
    (isGroup ? `${memberCount} üye · Etkinlik grubu` : "Henüz mesaj yok");
  const translateX = useRef(new Animated.Value(0)).current;
  const currentOffset = useRef(0);

  const animateTo = (value: number) => {
    currentOffset.current = value;
    Animated.spring(translateX, {
      toValue: value,
      useNativeDriver: true,
      damping: 18,
      stiffness: 170,
      mass: 0.7,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 7 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        const next = Math.max(-MAX_SWIPE_LEFT, Math.min(MAX_SWIPE_RIGHT, currentOffset.current + gesture.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const next = currentOffset.current + gesture.dx;
        if (next < -MAX_SWIPE_LEFT / 2) {
          animateTo(-MAX_SWIPE_LEFT);
          return;
        }
        if (next > MAX_SWIPE_RIGHT / 2) {
          animateTo(MAX_SWIPE_RIGHT);
          return;
        }
        animateTo(0);
      },
      onPanResponderTerminate: () => animateTo(0),
    }),
  ).current;

  const handleMute = () => {
    animateTo(0);
    onMute?.();
  };

  const handleDelete = () => {
    animateTo(0);
    onDelete?.();
  };

  const handleArchive = () => {
    animateTo(0);
    onArchive?.();
  };

  return (
    <View style={styles.swipeRoot}>
      {onArchive ? (
        <View style={styles.leftActionsLayer}>
          <Pressable onPress={handleArchive} style={[styles.actionCircle, styles.archiveAction]}>
            <Ionicons color="#FFFFFF" name="archive-outline" size={22} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.actionsLayer}>
        {onMute ? (
          <Pressable onPress={handleMute} style={[styles.actionCircle, styles.muteAction]}>
            <Ionicons
              color="#FFFFFF"
              name={isMuted ? "notifications-outline" : "notifications-off-outline"}
              size={22}
            />
          </Pressable>
        ) : null}
        {onDelete ? (
          <Pressable onPress={handleDelete} style={[styles.actionCircle, styles.deleteAction]}>
            <Ionicons color="#FFFFFF" name="trash-outline" size={22} />
          </Pressable>
        ) : null}
      </View>

      <Animated.View style={[styles.rowWrap, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <Pressable
          onPress={() => {
            if (currentOffset.current !== 0) {
              animateTo(0);
              return;
            }
            onPress();
          }}
          style={styles.container}
        >
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              {isGroup ? (
                <Ionicons color={theme.colors.primary} name="people" size={22} />
              ) : isSystemInbox ? (
                <Ionicons color="#4338CA" name="information-circle" size={24} />
              ) : (
                <AppText style={styles.initials} variant="label">
                  {initials}
                </AppText>
              )}
            </View>
            {isOnline && !isGroup ? <View style={styles.onlineDot} /> : null}
          </View>

          <View style={styles.content}>
            <View style={styles.topLine}>
              <View style={styles.titleRow}>
                <AppText style={styles.title} numberOfLines={1} variant="label">
                  {title}
                </AppText>
                {isMuted ? (
                  <Ionicons color={theme.colors.textSecondary} name="notifications-off-outline" size={14} />
                ) : null}
                {isArchivedGroup ? (
                  <View style={styles.archivedBadge}>
                    <AppText style={styles.archivedBadgeText} variant="caption">
                      Arşivlendi
                    </AppText>
                  </View>
                ) : null}
              </View>
              {time ? (
                <AppText style={styles.time} variant="caption">
                  {time}
                </AppText>
              ) : null}
            </View>

            <View style={styles.previewLine}>
              <AppText numberOfLines={1} style={[styles.preview, unreadCount > 0 && styles.previewUnread]} variant="body">
                {previewText}
              </AppText>
              {unreadCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <AppText style={styles.unreadText} variant="caption">
                    {unreadCount}
                  </AppText>
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeRoot: {
    position: "relative",
  },
  rowWrap: {
    zIndex: 2,
  },
  leftActionsLayer: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    left: theme.spacing.sm,
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  actionsLayer: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    position: "absolute",
    right: theme.spacing.sm,
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  actionCircle: {
    alignItems: "center",
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  archiveAction: {
    backgroundColor: "#B45309",
  },
  muteAction: {
    backgroundColor: "#5B6BFF",
  },
  deleteAction: {
    backgroundColor: "#FF3B46",
  },
  container: {
    alignItems: "center",
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: 18,
    flexDirection: "row",
    gap: theme.spacing.md,
    minHeight: 82,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    shadowColor: "#000000",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    alignItems: "center",
    borderRadius: 27,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  initials: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  onlineDot: {
    backgroundColor: "#18D66B",
    borderColor: "#FFFFFF",
    borderRadius: 7,
    borderWidth: 3,
    bottom: 2,
    height: 14,
    position: "absolute",
    right: 2,
    width: 14,
  },
  content: {
    flex: 1,
    gap: 5,
  },
  topLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  titleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: theme.spacing.xs,
    minWidth: 0,
  },
  title: {
    color: theme.colors.textPrimary,
    flexShrink: 1,
    fontSize: 15,
  },
  archivedBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  archivedBadgeText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: "700",
  },
  time: {
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.sm,
  },
  previewLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  preview: {
    color: theme.colors.textSecondary,
    flex: 1,
    fontSize: 15,
  },
  previewUnread: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  unreadBadge: {
    alignItems: "center",
    backgroundColor: "#5B3CF6",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    minWidth: 24,
    paddingHorizontal: theme.spacing.xs,
  },
  unreadText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
