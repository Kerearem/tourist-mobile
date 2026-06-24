import React, { useCallback, useMemo, useState } from "react";
import { FlatList, ImageBackground, Pressable, SafeAreaView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { theme } from "../../../constants/theme";
import { getEventById } from "../../events/services/events.service";
import type { EventItem } from "../../events/types";
import {
  getEventGroup,
  removeEventGroupMember,
  type EventGroupInfo,
  type EventGroupMember,
} from "../../events/services/eventGroup.service";
import type { MessagesStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<MessagesStackParamList, "GroupInfoScreen">;

const getCoverUri = (event: EventItem | null, title: string) => {
  if (event?.coverImageUrl) {
    return event.coverImageUrl;
  }
  if (event?.type === "food") {
    return "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1400&q=80";
  }
  if (event?.type === "outdoor") {
    return "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=80";
  }
  void title;
  return "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80";
};

export function GroupInfoScreen({ navigation, route }: Props) {
  const [group, setGroup] = useState<EventGroupInfo | null>(null);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const loadGroup = async () => {
    setIsLoading(true);
    try {
      const [groupResult, eventResult] = await Promise.all([
        getEventGroup(route.params.eventId),
        getEventById(route.params.eventId),
      ]);
      setGroup(groupResult);
      setEvent(eventResult);
      setError(groupResult ? null : "Grup bulunamadı.");
    } catch {
      setGroup(null);
      setEvent(null);
      setError("Grup yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadGroup();
    }, [route.params.eventId]),
  );

  const coverUri = useMemo(() => getCoverUri(event, group?.title ?? ""), [event, group?.title]);

  const onRemoveMember = async (member: EventGroupMember) => {
    if (!group || removingUserId || member.role === "ORGANIZER" || group.isArchived) {
      return;
    }

    setRemovingUserId(member.id);
    try {
      const updated = await removeEventGroupMember(group.eventId, member.id);
      setGroup(updated);
      setError(null);
    } catch {
      setError("Üye gruptan çıkarılamadı.");
    } finally {
      setRemovingUserId(null);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pagePadding}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Grup Bilgisi" />
          <Card style={styles.stateCard}>
            <Loader label="Grup yükleniyor..." />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !group) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.pagePadding}>
          <ScreenBackHeader onBack={() => navigation.goBack()} title="Grup Bilgisi" />
          <Card style={styles.stateCard}>
            <ErrorState onRetry={() => void loadGroup()} subtitle={error ?? undefined} title="Grup bulunamadı" />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const isOrganizer = group.viewerRole === "ORGANIZER";
  const locationLabel = event
    ? event.venueName
      ? `${event.city}, ${event.countryCode} · ${event.venueName}`
      : `${event.city}, ${event.countryCode}`
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pagePadding}>
        <ScreenBackHeader onBack={() => navigation.goBack()} title="Grup Bilgisi" />
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={group.members}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Card style={styles.heroCard}>
              <ImageBackground imageStyle={styles.heroImage} source={{ uri: coverUri }} style={styles.heroCover}>
                <View style={styles.heroOverlay} />
                <View style={styles.heroBadge}>
                  <Ionicons color="#FFFFFF" name="people" size={16} />
                  <AppText style={styles.heroBadgeText} variant="caption">
                    Etkinlik Grubu
                  </AppText>
                </View>
              </ImageBackground>
              <View style={styles.heroBody}>
                <AppText style={styles.heroTitle} variant="sectionTitle">
                  {group.title}
                </AppText>
                {locationLabel ? (
                  <AppText style={styles.heroMeta} variant="caption">
                    {locationLabel}
                  </AppText>
                ) : null}
                <View style={styles.statsRow}>
                  <View style={styles.statPill}>
                    <Ionicons color={theme.colors.primary} name="person" size={16} />
                    <AppText style={styles.statText} variant="caption">
                      {group.memberCount} üye
                    </AppText>
                  </View>
                  <View style={styles.statPill}>
                    <Ionicons color={theme.colors.primary} name="calendar-outline" size={16} />
                    <AppText style={styles.statText} variant="caption">
                      {isOrganizer ? "Organizatör" : "Üye"}
                    </AppText>
                  </View>
                </View>
              </View>
            </Card>

            {group.isArchived ? (
              <View style={styles.archivedBanner}>
                <Ionicons color={theme.colors.textSecondary} name="archive-outline" size={18} />
                <AppText style={styles.archivedBannerText} variant="caption">
                  Bu grup arşivlendi
                </AppText>
              </View>
            ) : null}

            <AppText style={styles.membersTitle} variant="label">
              Üyeler ({group.memberCount})
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.memberRow, item.hasBlockRelation && styles.memberRowBlocked]}>
            <Avatar initials={item.displayName.slice(0, 2).toUpperCase()} size={48} uri={item.avatarUrl} />
            <View style={styles.memberText}>
              <AppText variant="label">{item.displayName}</AppText>
              <View style={styles.roleRow}>
                <View style={[styles.roleBadge, item.role === "ORGANIZER" && styles.roleBadgeOrganizer]}>
                  <AppText
                    style={[styles.roleBadgeText, item.role === "ORGANIZER" && styles.roleBadgeTextOrganizer]}
                    variant="caption"
                  >
                    {item.role === "ORGANIZER" ? "Organizatör" : "Üye"}
                  </AppText>
                </View>
                {item.hasBlockRelation ? (
                  <View style={styles.blockBadge}>
                    <Ionicons color="#B91C1C" name="alert-circle-outline" size={12} />
                    <AppText style={styles.blockBadgeText} variant="caption">
                      Engel
                    </AppText>
                  </View>
                ) : null}
                {item.isFriend ? (
                  <View style={styles.friendBadge}>
                    <AppText style={styles.friendBadgeText} variant="caption">
                      Arkadaş
                    </AppText>
                  </View>
                ) : null}
              </View>
            </View>
            {isOrganizer && item.role !== "ORGANIZER" && !group.isArchived ? (
              <Pressable
                disabled={removingUserId === item.id}
                onPress={() => void onRemoveMember(item)}
                style={styles.removeButton}
              >
                <AppText style={styles.removeButtonText} variant="caption">
                  {removingUserId === item.id ? "..." : "Çıkar"}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#F8FAFC",
    flex: 1,
  },
  pagePadding: {
    paddingHorizontal: theme.spacing.lg,
  },
  listContent: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  headerBlock: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  heroCard: {
    overflow: "hidden",
    padding: 0,
  },
  heroCover: {
    height: 160,
    justifyContent: "flex-end",
  },
  heroImage: {
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.28)",
  },
  heroBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(17, 24, 39, 0.72)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    margin: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  heroBody: {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  heroTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
  },
  heroMeta: {
    color: theme.colors.textSecondary,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  statPill: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  statText: {
    color: "#1D4ED8",
    fontWeight: "600",
  },
  archivedBanner: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: theme.radius.lg,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  archivedBannerText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  membersTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: theme.spacing.xs,
  },
  memberRow: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  memberRowBlocked: {
    backgroundColor: "rgba(254, 226, 226, 0.55)",
    borderColor: "#FECACA",
  },
  memberText: {
    flex: 1,
    gap: 6,
  },
  roleRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  blockBadge: {
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  blockBadgeText: {
    color: "#B91C1C",
    fontWeight: "700",
  },
  friendBadge: {
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  friendBadgeText: {
    color: "#047857",
    fontWeight: "700",
  },
  roleBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  roleBadgeOrganizer: {
    backgroundColor: "#DBEAFE",
  },
  roleBadgeText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
  },
  roleBadgeTextOrganizer: {
    color: "#1D4ED8",
  },
  removeButton: {
    backgroundColor: "#FEF2F2",
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  removeButtonText: {
    color: theme.colors.danger,
    fontWeight: "700",
  },
  stateCard: {
    flex: 1,
    justifyContent: "center",
    marginTop: theme.spacing.md,
  },
});
