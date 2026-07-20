import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  ImageBackground,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

import { Avatar } from "../../../components/ui/Avatar";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { ErrorState } from "../../../components/ui/ErrorState";
import { Loader } from "../../../components/ui/Loader";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { MessagesRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import { getEventById } from "../../events/services/events.service";
import type { EventItem } from "../../events/types";
import {
  banEventGroupMember,
  closeEventGroup,
  getEventGroup,
  kickEventGroupMember,
  muteEventGroupMember,
  unmuteEventGroupMember,
  type EventGroupInfo,
  type EventGroupMember,
  type MuteDurationMinutes,
} from "../../events/services/eventGroup.service";
import {
  ComplaintReasonSheet,
} from "../../profile/components/ComplaintReasonSheet";
import {
  createUserComplaint,
  type ComplaintReason,
} from "../../profile/services/complaints.service";
import type { MessagesStackParamList } from "../../../navigation/types";
import { GroupMemberActionSheet } from "../components/GroupMemberActionSheet";
import { GroupModerationReasonModal } from "../components/GroupModerationReasonModal";
import { GroupMuteDurationSheet } from "../components/GroupMuteDurationSheet";
import {
  buildGroupMemberProfileParams,
  canOpenGroupMemberProfile,
} from "../utils/conversationInfoNavigation";
import {
  canCloseEventGroup,
  formatMuteRemainingLabel,
  isActiveMutedUntil,
  resolveGroupMemberActionFlags,
} from "../utils/groupModeration";

type Props = NativeStackScreenProps<MessagesStackParamList, "GroupInfoScreen">;

type ReasonMode = "kick" | "ban";

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
  const { user } = useAuth();
  const viewerId = user?.id ?? "";
  const [group, setGroup] = useState<EventGroupInfo | null>(null);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMember, setActionMember] = useState<EventGroupMember | null>(null);
  const [reasonMode, setReasonMode] = useState<ReasonMode | null>(null);
  const [muteMember, setMuteMember] = useState<EventGroupMember | null>(null);
  const [reportMember, setReportMember] = useState<EventGroupMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const loadGroup = async () => {
    setIsLoading(true);
    try {
      const groupResult = await getEventGroup(route.params.eventId);
      if (!groupResult) {
        setGroup(null);
        setEvent(null);
        setError("Grup bulunamadı.");
        return;
      }

      setGroup(groupResult);
      setError(null);

      try {
        const eventResult = await getEventById(route.params.eventId);
        setEvent(eventResult);
      } catch {
        setEvent(null);
      }
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
  const isOrganizer = group?.viewerRole === "ORGANIZER";
  const eventStatus =
    typeof event?.metadata?.status === "string" ? event.metadata.status : null;
  const showCloseGroup = Boolean(
    group &&
      canCloseEventGroup({
        viewerIsOrganizer: Boolean(isOrganizer),
        isClosed: group.isClosed,
        eventStatus,
      }),
  );

  const onOpenMemberProfile = (member: EventGroupMember) => {
    if (!canOpenGroupMemberProfile(member.id, viewerId)) {
      return;
    }

    navigation.navigate(
      MessagesRoutes.MessageUserProfileScreen,
      buildGroupMemberProfileParams(member),
    );
  };

  const closeActionSheet = () => setActionMember(null);

  const onConfirmReason = async (reason: string) => {
    if (!group || !actionMember || !reasonMode || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updated =
        reasonMode === "ban"
          ? await banEventGroupMember(group.eventId, actionMember.id, reason)
          : await kickEventGroupMember(group.eventId, actionMember.id, reason);
      setGroup(updated);
      setReasonMode(null);
      setActionMember(null);
      setError(null);
    } catch (actionError) {
      Alert.alert(
        reasonMode === "ban" ? "Banlanamadı" : "Çıkarılamadı",
        actionError instanceof Error ? actionError.message : "Lütfen tekrar deneyin.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSelectMuteDuration = async (durationMinutes: MuteDurationMinutes) => {
    if (!group || !muteMember || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await muteEventGroupMember(group.eventId, muteMember.id, durationMinutes);
      setGroup(updated);
      setMuteMember(null);
      setActionMember(null);
      setError(null);
    } catch (muteError) {
      Alert.alert(
        "Susturulamadı",
        muteError instanceof Error ? muteError.message : "Lütfen tekrar deneyin.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onUnmuteMember = async (member: EventGroupMember) => {
    if (!group || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    closeActionSheet();
    try {
      const updated = await unmuteEventGroupMember(group.eventId, member.id);
      setGroup(updated);
      setError(null);
    } catch (unmuteError) {
      Alert.alert(
        "Susturma kaldırılamadı",
        unmuteError instanceof Error ? unmuteError.message : "Lütfen tekrar deneyin.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitReport = async (reason: ComplaintReason) => {
    if (!reportMember || isReporting) {
      return;
    }

    setIsReporting(true);
    try {
      await createUserComplaint({ targetUserId: reportMember.id, reason });
      setReportMember(null);
      Alert.alert("Şikayet alındı", "İnceleme için teşekkürler.");
    } catch (reportError) {
      Alert.alert(
        "Şikayet gönderilemedi",
        reportError instanceof Error ? reportError.message : "Lütfen tekrar deneyin.",
      );
    } finally {
      setIsReporting(false);
    }
  };

  const onCloseGroup = () => {
    if (!group || isSubmitting) {
      return;
    }

    Alert.alert(
      "Grubu kapat",
      "Kapandıktan sonra kimse mesaj gönderemez. Geçmiş mesajlar okunur kalır.",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Kapat",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setIsSubmitting(true);
              try {
                const updated = await closeEventGroup(group.eventId);
                setGroup(updated);
                setError(null);
              } catch (closeError) {
                Alert.alert(
                  "Grup kapatılamadı",
                  closeError instanceof Error ? closeError.message : "Lütfen tekrar deneyin.",
                );
              } finally {
                setIsSubmitting(false);
              }
            })();
          },
        },
      ],
    );
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

  const locationLabel = event
    ? event.venueName
      ? `${event.city}, ${event.countryCode} · ${event.venueName}`
      : `${event.city}, ${event.countryCode}`
    : null;

  const actionFlags = actionMember
    ? resolveGroupMemberActionFlags({
        viewerId,
        viewerIsOrganizer: Boolean(isOrganizer),
        member: actionMember,
        isClosed: group.isClosed,
        isArchived: group.isArchived,
      })
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

            {group.isClosed ? (
              <View style={styles.closedBanner}>
                <Ionicons color="#7C2D12" name="lock-closed-outline" size={18} />
                <AppText style={styles.closedBannerText} variant="caption">
                  Bu grup kapatıldı
                </AppText>
              </View>
            ) : null}

            {group.isArchived && !group.isClosed ? (
              <View style={styles.archivedBanner}>
                <Ionicons color={theme.colors.textSecondary} name="archive-outline" size={18} />
                <AppText style={styles.archivedBannerText} variant="caption">
                  Etkinlik tamamlandı · grup arşivlendi
                </AppText>
              </View>
            ) : null}

            {showCloseGroup ? (
              <Pressable
                disabled={isSubmitting}
                onPress={onCloseGroup}
                style={({ pressed }) => [styles.closeGroupButton, pressed && styles.closeGroupPressed]}
              >
                <Ionicons color="#7C2D12" name="lock-closed-outline" size={18} />
                <AppText style={styles.closeGroupText} variant="label">
                  Grubu Kapat
                </AppText>
              </Pressable>
            ) : null}

            <AppText style={styles.membersTitle} variant="label">
              Üyeler ({group.memberCount})
            </AppText>
            {isOrganizer ? (
              <AppText style={styles.membersHint} variant="caption">
                Üyeye basılı tutarak moderasyon menüsünü aç
              </AppText>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const muteRemaining = formatMuteRemainingLabel(item.mutedUntil);
          const flags = resolveGroupMemberActionFlags({
            viewerId,
            viewerIsOrganizer: Boolean(isOrganizer),
            member: item,
            isClosed: group.isClosed,
            isArchived: group.isArchived,
          });

          return (
            <Pressable
              accessibilityRole="button"
              delayLongPress={280}
              disabled={!canOpenGroupMemberProfile(item.id, viewerId) && !flags.canOpenSheet}
              onLongPress={() => {
                if (flags.canOpenSheet) {
                  setActionMember(item);
                }
              }}
              onPress={() => onOpenMemberProfile(item)}
              style={[styles.memberRow, item.hasBlockRelation && styles.memberRowBlocked]}
            >
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
                  {isActiveMutedUntil(item.mutedUntil) ? (
                    <View style={styles.muteBadge}>
                      <Ionicons color="#6D28D9" name="volume-mute" size={12} />
                      <AppText style={styles.muteBadgeText} variant="caption">
                        Susturuldu{muteRemaining ? ` · ${muteRemaining}` : ""}
                      </AppText>
                    </View>
                  ) : null}
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
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
      />

      <GroupMemberActionSheet
        flags={
          actionFlags ?? {
            canOpenSheet: false,
            showProfile: false,
            showReport: false,
            showKick: false,
            showBan: false,
            showMute: false,
            showUnmute: false,
          }
        }
        memberName={actionMember?.displayName ?? ""}
        onBan={() => {
          setReasonMode("ban");
        }}
        onClose={closeActionSheet}
        onKick={() => {
          setReasonMode("kick");
        }}
        onMute={() => {
          if (actionMember) {
            setMuteMember(actionMember);
          }
          closeActionSheet();
        }}
        onProfile={() => {
          if (actionMember) {
            onOpenMemberProfile(actionMember);
          }
          closeActionSheet();
        }}
        onReport={() => {
          if (actionMember) {
            setReportMember(actionMember);
          }
          closeActionSheet();
        }}
        onUnmute={() => {
          if (actionMember) {
            void onUnmuteMember(actionMember);
          }
        }}
        visible={Boolean(actionMember && actionFlags?.canOpenSheet && !reasonMode)}
      />

      <GroupModerationReasonModal
        isSubmitting={isSubmitting}
        memberName={actionMember?.displayName ?? ""}
        mode={reasonMode ?? "kick"}
        onClose={() => setReasonMode(null)}
        onConfirm={onConfirmReason}
        visible={Boolean(reasonMode && actionMember)}
      />

      <GroupMuteDurationSheet
        isSubmitting={isSubmitting}
        memberName={muteMember?.displayName ?? ""}
        onClose={() => setMuteMember(null)}
        onSelect={(duration) => void onSelectMuteDuration(duration)}
        visible={Boolean(muteMember)}
      />

      <ComplaintReasonSheet
        isSubmitting={isReporting}
        onClose={() => setReportMember(null)}
        onSubmit={onSubmitReport}
        title="Üyeyi şikayet et"
        visible={Boolean(reportMember)}
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
  closedBanner: {
    alignItems: "center",
    backgroundColor: "#FFEDD5",
    borderRadius: theme.radius.lg,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  closedBannerText: {
    color: "#7C2D12",
    fontWeight: "700",
  },
  closeGroupButton: {
    alignItems: "center",
    backgroundColor: "#FFEDD5",
    borderColor: "#FDBA74",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  closeGroupPressed: {
    opacity: 0.85,
  },
  closeGroupText: {
    color: "#7C2D12",
    fontWeight: "700",
  },
  membersTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginTop: theme.spacing.xs,
  },
  membersHint: {
    color: theme.colors.textSecondary,
    marginTop: -theme.spacing.xs,
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
  muteBadge: {
    alignItems: "center",
    backgroundColor: "#EDE9FE",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  muteBadgeText: {
    color: "#6D28D9",
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
  stateCard: {
    flex: 1,
    justifyContent: "center",
    marginTop: theme.spacing.md,
  },
});
