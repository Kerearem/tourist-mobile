import React from "react";
import { ImageBackground, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../../components/ui/AppText";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { theme } from "../../../constants/theme";
import type { EventItem } from "../types";
import { getEventTypeLabel } from "../constants/eventTypes";

type EventCardProps = {
  event: EventItem;
  isJoined: boolean;
  onToggleJoin: () => void;
  onPress: () => void;
};

const getCoverUri = (event: EventItem) => {
  if (event.coverImageUrl) {
    return event.coverImageUrl;
  }
  if (event.type === "food") {
    return "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1400&q=80";
  }
  if (event.type === "outdoor") {
    return "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=80";
  }
  return "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80";
};

const formatTime = (startsAt: string) => {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    return "12:00 PM";
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDateBadge = (startsAt: string) => {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    return { day: "--", weekday: "DAY" };
  }
  return {
    day: date.toLocaleDateString([], { day: "2-digit" }),
    weekday: date.toLocaleDateString([], { weekday: "short" }).toUpperCase(),
  };
};

const typeLabel = (event: EventItem) => getEventTypeLabel(event.type);

const priceLabel = (event: EventItem) => {
  if (event.metadata?.isPaid === true) {
    return "Ücretli";
  }
  return "Ücretsiz";
};

const ratingLabel = (_event: EventItem) => "4.8";

export function EventCard({ event, isJoined: _isJoined, onToggleJoin: _onToggleJoin, onPress }: EventCardProps) {
  const dateBadge = formatDateBadge(event.startsAt);
  const attendeePreview = ["U1", "U2", "U3", `+${Math.max(0, event.attendeeCount - 3)}`];

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card}>
        <ImageBackground imageStyle={styles.coverImage} source={{ uri: getCoverUri(event) }} style={styles.cover}>
          <View style={styles.dateBadge}>
            <AppText style={styles.dateWeekday} variant="caption">
              {dateBadge.weekday}
            </AppText>
            <AppText style={styles.dateDay} variant="sectionTitle">
              {dateBadge.day}
            </AppText>
          </View>

          <Pressable style={styles.heartButton}>
            <Ionicons color="#FFFFFF" name="heart-outline" size={22} />
          </Pressable>

          <View style={styles.locationPill}>
            <Ionicons color="#FFFFFF" name="location-outline" size={14} />
            <AppText style={styles.locationText} variant="caption">
              {event.city || "Berlin"}
            </AppText>
          </View>

          <View style={styles.dots}>
            <View style={styles.dotActive} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <AppText style={styles.locationTitle} variant="sectionTitle">
              {event.city}, {event.countryCode}
            </AppText>
            <View style={styles.ratingWrap}>
              <Ionicons color="#111827" name="star" size={16} />
              <AppText style={styles.ratingText} variant="label">
                {ratingLabel(event)}
              </AppText>
            </View>
          </View>

          <View style={styles.titleRow}>
            <AppText numberOfLines={2} style={styles.title} variant="sectionTitle">
              {event.title}
            </AppText>
          </View>

          <View style={styles.subMeta}>
            <AppText numberOfLines={1} style={styles.subMetaText} variant="bodyMuted">
              Stay with {event.host.displayName} · Hosting for 8 years
            </AppText>
            <Badge label={typeLabel(event)} />
          </View>

          <AppText style={styles.dateLine} variant="bodyMuted">
            {formatTime(event.startsAt)}
          </AppText>

          <View style={styles.footer}>
            <AppText style={styles.priceText} variant="label">
              {priceLabel(event) === "Ücretsiz" ? "Ücretsiz · bilet gerekmez" : `${priceLabel(event)} · kişi başı`}
            </AppText>
            <Badge label={priceLabel(event)} />
          </View>

          <View style={styles.attendees}>
            {attendeePreview.map((item, index) => (
              <View key={`${item}_${index}`} style={[styles.attendeeCircle, index > 0 && styles.attendeeOverlap]}>
                <AppText style={styles.attendeeText} variant="caption">
                  {item}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.lg,
    overflow: "hidden",
    padding: 0,
  },
  cover: {
    height: 204,
    justifyContent: "space-between",
    padding: theme.spacing.md,
  },
  coverImage: {
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
  },
  dateBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    minWidth: 56,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  dateWeekday: {
    color: "#EF4444",
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  dateDay: {
    color: theme.colors.textPrimary,
    lineHeight: 24,
  },
  heartButton: {
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.42)",
    borderRadius: 16,
    bottom: theme.spacing.md,
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: theme.spacing.md,
    width: 32,
  },
  locationPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(17, 24, 39, 0.82)",
    borderRadius: 999,
    flexDirection: "row",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  dots: {
    alignItems: "center",
    alignSelf: "center",
    bottom: 10,
    flexDirection: "row",
    gap: 6,
    position: "absolute",
  },
  dot: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    height: 6,
    width: 16,
  },
  locationText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  body: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  locationTitle: {
    color: theme.colors.textPrimary,
    lineHeight: 32,
  },
  ratingWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  ratingText: {
    color: theme.colors.textPrimary,
  },
  titleRow: {
    marginTop: -2,
  },
  title: {
    color: theme.colors.textPrimary,
    lineHeight: 30,
  },
  subMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
  },
  subMetaText: {
    flex: 1,
  },
  dateLine: {
    color: "#6B7280",
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "space-between",
  },
  priceText: {
    color: theme.colors.textPrimary,
    flex: 1,
    fontSize: 15,
  },
  attendees: {
    flexDirection: "row",
    paddingLeft: 0,
  },
  attendeeCircle: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderColor: "#FFFFFF",
    borderRadius: 13,
    borderWidth: 2,
    height: 26,
    justifyContent: "center",
    minWidth: 26,
    paddingHorizontal: 6,
  },
  attendeeOverlap: {
    marginLeft: -8,
  },
  attendeeText: {
    color: "#6B7280",
    fontWeight: "700",
  },
});
