import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { AppText } from "../../../components/ui/AppText";
import { VerifiedNameRow } from "../../../components/ui/VerifiedNameRow";
import { theme } from "../../../constants/theme";
import type { OrganizerStatus } from "../../../models/user";
import { formatProfileLocation } from "../../../utils/formatProfileLocation";
import {
  COMPLAINT_REASON_OPTIONS,
  createUserComplaint,
  type ComplaintReason,
} from "../services/complaints.service";
import type { UserBlockStatus } from "../services/block.service";
import type { FollowStatus } from "../services/follow.service";
import { getFollowButtonLabel } from "../services/follow.service";
import type { UserProfileStats } from "../services/userProfile.service";
import { ProfileAvatarRing } from "./ProfileAvatarRing";
import { ProfileContentTabs } from "./ProfileContentTabs";
import { ProfileStatsRow } from "./ProfileStatsRow";
import type { PublicUserProfileSeed } from "../types/publicUserProfile";
import {
  buildPublicUserProfileSeed,
  loadPublicUserProfileDetails,
  togglePublicUserBlock,
  togglePublicUserFollow,
} from "../utils/loadPublicUserProfile";

export type PublicUserProfileViewProps = {
  userId: string;
  seed?: Partial<PublicUserProfileSeed> & { id: string };
  viewerId?: string;
  viewerOrganizerStatus?: OrganizerStatus;
  onBack: () => void;
  onOpenMessage?: (profile: PublicUserProfileSeed) => void;
  onActiveEventPress?: (eventId: string) => void;
  onPastEventPress?: (eventId: string) => void;
  onMemberEventPress?: (eventId: string) => void;
};

export function PublicUserProfileView({
  userId,
  seed,
  viewerId,
  viewerOrganizerStatus,
  onBack,
  onOpenMessage,
  onActiveEventPress,
  onPastEventPress,
  onMemberEventPress,
}: PublicUserProfileViewProps) {
  const initialSeed = useMemo(
    () =>
      buildPublicUserProfileSeed({
        id: userId,
        username: seed?.username,
        displayName: seed?.displayName,
        avatarUrl: seed?.avatarUrl,
        isOrganizer: seed?.isOrganizer,
        bio: seed?.bio,
        city: seed?.city,
        countryCode: seed?.countryCode,
        accountType: seed?.accountType,
        verificationBadge: seed?.verificationBadge,
      }),
    [seed, userId],
  );

  const [profile, setProfile] = useState<PublicUserProfileSeed>(initialSeed);
  const [blockStatus, setBlockStatus] = useState<UserBlockStatus | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus | null>(null);
  const [profileStats, setProfileStats] = useState<UserProfileStats | null>(null);
  const [isFollowActionLoading, setIsFollowActionLoading] = useState(false);
  const [isProfileActionLoading, setIsProfileActionLoading] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<ComplaintReason | null>(null);
  const [profileContentRefreshToken, setProfileContentRefreshToken] = useState(0);

  useEffect(() => {
    setProfile(initialSeed);
  }, [initialSeed]);

  const loadProfileDetails = useCallback(async () => {
    try {
      const details = await loadPublicUserProfileDetails(initialSeed);
      setProfile(details.profile);
      setBlockStatus(details.blockStatus);
      setFollowStatus(details.followStatus);
      setProfileStats(details.stats);
    } catch {
      setBlockStatus(null);
      setFollowStatus(null);
      setProfileStats(null);
    }
  }, [initialSeed]);

  useEffect(() => {
    void loadProfileDetails();
  }, [loadProfileDetails]);

  useFocusEffect(
    useCallback(() => {
      setProfileContentRefreshToken((value) => value + 1);
    }, []),
  );

  const profileLocation = useMemo(
    () => formatProfileLocation(profile.city, profile.countryCode),
    [profile.city, profile.countryCode],
  );

  const isOrganizerProfile = Boolean(
    profile.id === viewerId ? viewerOrganizerStatus === "approved" : profile.isOrganizer,
  );

  const toggleFollowUser = () => {
    if (isFollowActionLoading || blockStatus?.isBlocked) {
      return;
    }

    void (async () => {
      setIsFollowActionLoading(true);
      try {
        const nextStatus = await togglePublicUserFollow(profile.id, followStatus);
        setFollowStatus(nextStatus);
      } catch (error) {
        Alert.alert("Hata", error instanceof Error ? error.message : "Takip işlemi tamamlanamadı.");
      } finally {
        setIsFollowActionLoading(false);
      }
    })();
  };

  const onToggleBlockUser = async () => {
    if (isProfileActionLoading) {
      return;
    }

    setIsProfileActionLoading(true);
    try {
      const nextStatus = await togglePublicUserBlock(profile.id, blockStatus);
      setBlockStatus(nextStatus);
      if (nextStatus.blockedByMe) {
        setFollowStatus({ iFollow: false, followsMe: false, isFriend: false });
        Alert.alert("Engellendi", `${profile.displayName} kullanıcısını engellediniz.`);
      } else {
        Alert.alert("Engel kaldırıldı", `${profile.displayName} kullanıcısının engeli kaldırıldı.`);
      }
      setIsProfileMenuOpen(false);
    } catch (error) {
      Alert.alert("Hata", error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      setIsProfileActionLoading(false);
    }
  };

  const onSubmitReport = async () => {
    if (!selectedReportReason || isProfileActionLoading) {
      return;
    }

    setIsProfileActionLoading(true);
    try {
      await createUserComplaint({
        targetUserId: profile.id,
        reason: selectedReportReason,
      });
      setIsReportModalOpen(false);
      setSelectedReportReason(null);
      setIsProfileMenuOpen(false);
      Alert.alert("Şikayet alındı", "Şikayetiniz incelenmek üzere kaydedildi.");
    } catch (error) {
      Alert.alert("Hata", error instanceof Error ? error.message : "Şikayet gönderilemedi.");
    } finally {
      setIsProfileActionLoading(false);
    }
  };

  const handleOpenMessage = () => {
    if (!onOpenMessage) {
      return;
    }
    if (blockStatus?.isBlocked) {
      Alert.alert(
        "Mesaj gönderilemiyor",
        blockStatus.blockedByMe
          ? "Bu kullanıcıyı engellediniz."
          : "Bu kullanıcıyla mesajlaşamazsın.",
      );
      return;
    }
    onOpenMessage(profile);
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable onPress={onBack} style={styles.backButton}>
              <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={22} />
            </Pressable>
            <View style={styles.headerCenter} />
            <View style={styles.headerActions}>
              <Pressable onPress={() => setIsProfileMenuOpen(true)} style={styles.moreButton}>
                <Ionicons color={theme.colors.textPrimary} name="ellipsis-vertical" size={18} />
              </Pressable>
            </View>
          </View>

          <View style={styles.identity}>
            <ProfileAvatarRing
              avatarUrl={profile.avatarUrl}
              displayName={profile.displayName}
              showPlus={false}
            />
            <VerifiedNameRow
              accountType={profile.accountType}
              badgeSize={20}
              isOrganizer={isOrganizerProfile}
              name={profile.displayName}
              style={styles.displayNameRow}
              textStyle={styles.displayName}
              verificationBadge={profile.verificationBadge}
            />
            <AppText muted style={styles.username} variant="bodyMuted">
              @{profile.username}
            </AppText>
            {blockStatus?.isBlocked ? (
              <View style={styles.restricted}>
                <Ionicons color={theme.colors.textSecondary} name="eye-off-outline" size={28} />
                <AppText style={styles.restrictedTitle} variant="label">
                  {blockStatus.blockedByMe ? "Bu kullanıcıyı engellediniz" : "Profil görüntülenemiyor"}
                </AppText>
                <AppText style={styles.restrictedText} variant="bodyMuted">
                  {blockStatus.blockedByMe
                    ? "Engeli kaldırmak için menüden Engeli Kaldır seçeneğini kullanabilirsin."
                    : "Bu kullanıcıyla etkileşim kuramazsın."}
                </AppText>
              </View>
            ) : (
              <>
                {profileLocation ? (
                  <View style={styles.locationRow}>
                    <Ionicons color={theme.colors.textSecondary} name="location-outline" size={16} />
                    <AppText style={styles.location} variant="bodyMuted">
                      {profileLocation}
                    </AppText>
                  </View>
                ) : null}
                <AppText style={styles.bio} variant="body">
                  {profile.bio ?? `${profile.displayName} is part of the Tourist community.`}
                </AppText>
              </>
            )}
          </View>

          {!blockStatus?.isBlocked ? (
            <>
              <ProfileStatsRow
                events={profileStats?.events}
                helped={profileStats?.helped}
                organized={profileStats?.organized}
                showOrganized={isOrganizerProfile}
              />

              <Pressable style={styles.instagramButton}>
                <Ionicons color={theme.colors.textPrimary} name="logo-instagram" size={22} />
                <AppText style={styles.instagramText} variant="label">
                  Instagram Profile
                </AppText>
              </Pressable>

              <View style={styles.primaryActions}>
                <Pressable
                  disabled={isFollowActionLoading}
                  onPress={toggleFollowUser}
                  style={[
                    styles.followButton,
                    styles.primaryActionButton,
                    followStatus?.iFollow && styles.followButtonActive,
                    followStatus?.isFriend && styles.followButtonFriend,
                  ]}
                >
                  <AppText
                    style={[
                      styles.followButtonText,
                      followStatus?.iFollow && styles.followButtonTextActive,
                      followStatus?.isFriend && styles.followButtonTextFriend,
                    ]}
                    variant="caption"
                  >
                    {isFollowActionLoading
                      ? "..."
                      : followStatus
                        ? getFollowButtonLabel(followStatus)
                        : "Takip Et"}
                  </AppText>
                </Pressable>
                {onOpenMessage ? (
                  <Pressable onPress={handleOpenMessage} style={[styles.messageButton, styles.primaryActionButton]}>
                    <AppText style={styles.messageButtonText} variant="caption">
                      Mesaj
                    </AppText>
                  </Pressable>
                ) : null}
              </View>

              <ProfileContentTabs
                isOrganizer={isOrganizerProfile}
                isOwnProfile={profile.id === viewerId}
                onActiveEventPress={onActiveEventPress}
                onEventPress={onActiveEventPress}
                onMemberEventPress={onMemberEventPress ?? onPastEventPress}
                onPastEventPress={onPastEventPress}
                organizerDisplayName={profile.displayName}
                refreshToken={profileContentRefreshToken}
                userId={profile.id}
              />
            </>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsProfileMenuOpen(false)}
        transparent
        visible={isProfileMenuOpen}
      >
        <Pressable onPress={() => setIsProfileMenuOpen(false)} style={styles.menuBackdrop}>
          <View style={styles.menuWrap}>
            <Pressable style={styles.menuSheet}>
              <Pressable
                onPress={() => {
                  setIsProfileMenuOpen(false);
                  setSelectedReportReason(null);
                  setIsReportModalOpen(true);
                }}
                style={styles.menuItem}
              >
                <AppText style={[styles.menuItemText, styles.menuItemTextDanger]} variant="body">
                  Şikayet Et
                </AppText>
              </Pressable>
              <Pressable disabled={isProfileActionLoading} onPress={() => void onToggleBlockUser()} style={styles.menuItem}>
                <AppText style={styles.menuItemText} variant="body">
                  {blockStatus?.blockedByMe ? "Engeli Kaldır" : "Engelle"}
                </AppText>
              </Pressable>
            </Pressable>
            <Pressable onPress={() => setIsProfileMenuOpen(false)} style={styles.menuCancel}>
              <AppText style={styles.menuCancelText} variant="body">
                İptal
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => {
          setIsReportModalOpen(false);
          setSelectedReportReason(null);
        }}
        transparent
        visible={isReportModalOpen}
      >
        <Pressable
          onPress={() => {
            setIsReportModalOpen(false);
            setSelectedReportReason(null);
          }}
          style={styles.menuBackdrop}
        >
          <View style={styles.menuWrap}>
            <Pressable style={styles.menuSheet}>
              <AppText style={styles.reportModalTitle} variant="label">
                Şikayet sebebi
              </AppText>
              {COMPLAINT_REASON_OPTIONS.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setSelectedReportReason(item.value)}
                  style={styles.menuItem}
                >
                  <AppText
                    style={[
                      styles.menuItemText,
                      selectedReportReason === item.value && styles.reportReasonSelected,
                    ]}
                    variant="body"
                  >
                    {item.label}
                  </AppText>
                </Pressable>
              ))}
              <Pressable
                disabled={!selectedReportReason || isProfileActionLoading}
                onPress={() => void onSubmitReport()}
                style={[styles.reportSubmitButton, !selectedReportReason && styles.reportSubmitButtonDisabled]}
              >
                <AppText style={styles.reportSubmitButtonText} variant="label">
                  Gönder
                </AppText>
              </Pressable>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: theme.spacing.md,
  },
  container: {
    backgroundColor: "#FFFFFF",
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerCenter: {
    flex: 1,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  backButton: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  moreButton: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    width: 20,
  },
  identity: {
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  displayName: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  displayNameRow: {
    justifyContent: "center",
  },
  username: {
    textAlign: "center",
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.xs,
  },
  location: {
    textAlign: "center",
  },
  bio: {
    color: theme.colors.textPrimary,
    maxWidth: 330,
    textAlign: "center",
  },
  restricted: {
    alignItems: "center",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  restrictedTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  restrictedText: {
    color: theme.colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
  },
  instagramButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 999,
    flexDirection: "row",
    gap: theme.spacing.sm,
    justifyContent: "center",
    minHeight: 58,
    width: "88%",
  },
  instagramText: {
    color: theme.colors.textPrimary,
    fontSize: 17,
  },
  primaryActions: {
    alignSelf: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
    width: "88%",
  },
  primaryActionButton: {
    flex: 1,
    height: 44,
    minWidth: 0,
    paddingHorizontal: 0,
  },
  followButton: {
    alignItems: "center",
    borderColor: theme.colors.primary,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
  },
  followButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  followButtonText: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  followButtonTextActive: {
    color: "#FFFFFF",
  },
  followButtonFriend: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  followButtonTextFriend: {
    color: "#047857",
  },
  messageButton: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
  },
  messageButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
  },
  menuBackdrop: {
    backgroundColor: "rgba(17, 24, 39, 0.48)",
    flex: 1,
    justifyContent: "flex-end",
  },
  menuWrap: {
    paddingBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  menuSheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
  },
  menuItem: {
    alignItems: "center",
    borderBottomColor: "#EEF2F7",
    borderBottomWidth: 1,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: theme.spacing.lg,
  },
  menuItemText: {
    color: "#111827",
    fontSize: 18,
  },
  menuItemTextDanger: {
    color: "#DC2626",
  },
  menuCancel: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    justifyContent: "center",
    marginTop: theme.spacing.md,
    minHeight: 72,
  },
  menuCancelText: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "600",
  },
  reportModalTitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    textTransform: "uppercase",
  },
  reportReasonSelected: {
    color: theme.colors.danger,
    fontWeight: "700",
  },
  reportSubmitButton: {
    alignItems: "center",
    backgroundColor: theme.colors.danger,
    borderRadius: 12,
    justifyContent: "center",
    marginBottom: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    minHeight: 48,
  },
  reportSubmitButtonDisabled: {
    opacity: 0.45,
  },
  reportSubmitButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
