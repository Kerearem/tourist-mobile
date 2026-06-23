import React, { useCallback } from "react";
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppText } from "../../../components/ui/AppText";
import { EmptyState } from "../../../components/ui/EmptyState";
import { ProfileRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { ProfileStackParamList } from "../../../navigation/types";
import { getOrganizerStatus } from "../../events/services/organizer.service";

type Props = NativeStackScreenProps<ProfileStackParamList, "SettingsScreen">;

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  rightText?: string;
  danger?: boolean;
  onPress?: () => void;
};

type AccountMenuRowProps = {
  title: string;
  subtitle?: string;
  danger?: boolean;
  onPress?: () => void;
};

function SettingsRow({ icon, title, subtitle, rightText, danger, onPress }: SettingsRowProps) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.row}>
      <Ionicons color={danger ? theme.colors.danger : theme.colors.textPrimary} name={icon} size={24} />
      <View style={styles.rowCenter}>
        <AppText style={[styles.rowTitle, danger && styles.dangerText]} variant="body">
          {title}
        </AppText>
        {subtitle ? (
          <AppText numberOfLines={2} style={styles.rowSubtitle} variant="caption">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {rightText ? (
        <AppText style={styles.rightText} variant="caption">
          {rightText}
        </AppText>
      ) : onPress ? (
        <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
      ) : null}
    </Pressable>
  );
}

function AccountMenuRow({ title, subtitle, danger, onPress }: AccountMenuRowProps) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.accountMenuRow}>
      <View style={styles.accountMenuCenter}>
        <AppText style={[styles.accountMenuTitle, danger && styles.dangerText]} variant="body">
          {title}
        </AppText>
        {subtitle ? (
          <AppText style={[styles.accountMenuSubtitle, danger && styles.dangerSubtitle]} variant="caption">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {onPress ? (
        <Ionicons color={danger ? theme.colors.danger : theme.colors.muted} name="chevron-forward" size={22} />
      ) : null}
    </Pressable>
  );
}

type AccountInfoRowProps = {
  title: string;
  subtitle?: string;
  rightText?: string;
  warning?: boolean;
};

function AccountInfoRow({ title, subtitle, rightText, warning }: AccountInfoRowProps) {
  return (
    <View style={styles.accountMenuRow}>
      <View style={styles.accountMenuCenter}>
        <AppText style={styles.accountMenuTitle} variant="body">
          {title}
        </AppText>
        {subtitle ? (
          <AppText style={styles.accountMenuSubtitle} variant="caption">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={styles.accountInfoRight}>
        {warning ? (
          <View style={styles.warningDot}>
            <Ionicons color="#FFFFFF" name="alert" size={13} />
          </View>
        ) : null}
        {rightText ? (
          <AppText style={styles.accountInfoRightText} variant="caption">
            {rightText}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

type PlaceholderSheetProps = {
  visible: boolean;
  title: string;
  description: string;
  onClose: () => void;
};

function PlaceholderSheet({ visible, title, description, onClose }: PlaceholderSheetProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaView style={styles.sheetSafeArea}>
        <View style={styles.sheetTopBar}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={26} />
          </Pressable>
          <AppText style={styles.topTitle} variant="label">
            {title}
          </AppText>
          <View style={styles.topSpacer} />
        </View>
        <View style={styles.sheetBody}>
          <EmptyState description={description} title="Yakında" />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const { signOut, user, refreshSession } = useAuth();
  const [isAccountManagementOpen, setIsAccountManagementOpen] = React.useState(false);
  const [accountManagementView, setAccountManagementView] = React.useState<"management" | "info">("management");
  const [hasActiveEvent, setHasActiveEvent] = React.useState(false);
  const [activeEventTitle, setActiveEventTitle] = React.useState<string | null>(null);
  const [isLikesOpen, setIsLikesOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshSession();
      void (async () => {
        try {
          const status = await getOrganizerStatus();
          setHasActiveEvent(Boolean(status.hasActiveEvent));
          setActiveEventTitle(status.activeEventTitle ?? null);
        } catch {
          setHasActiveEvent(false);
          setActiveEventTitle(null);
        }
      })();
    }, [refreshSession]),
  );

  const organizerStatus = user?.organizerStatus ?? "not_applied";

  const onConfirmDeleteAccount = () => {
    setIsDeleteAccountOpen(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={26} />
          </Pressable>
          <AppText style={styles.topTitle} variant="label">
            Ayarlar
          </AppText>
          <View style={styles.topSpacer} />
        </View>

        <AppText style={styles.sectionTitle} variant="label">
          Hesabın
        </AppText>
        <SettingsRow
          icon="person-circle-outline"
          onPress={() => {
            setAccountManagementView("management");
            setIsAccountManagementOpen(true);
          }}
          subtitle="Şifre, güvenlik ve kişisel bilgiler"
          title="Hesap Yönetimi"
        />

        <View style={styles.sectionDivider} />
        <AppText style={styles.sectionTitle} variant="label">
          Organizatör
        </AppText>
        {organizerStatus === "approved" ? (
          <>
            {hasActiveEvent ? (
              <SettingsRow
                icon="information-circle-outline"
                subtitle={
                  activeEventTitle
                    ? `"${activeEventTitle}" bitene kadar yeni etkinlik oluşturamazsın.`
                    : "Zaten aktif bir etkinliğin var."
                }
                title="Zaten aktif bir etkinliğin var"
              />
            ) : (
              <SettingsRow
                icon="add-circle-outline"
                onPress={() => navigation.navigate(ProfileRoutes.CreateEventScreen)}
                title="Etkinlik Oluştur"
              />
            )}
            <SettingsRow
              icon="calendar-outline"
              onPress={() => navigation.navigate(ProfileRoutes.MyOrganizerEventsScreen)}
              title="Etkinliklerim"
            />
          </>
        ) : null}
        {organizerStatus === "pending" ? (
          <SettingsRow
            icon="time-outline"
            subtitle="Organizatör başvurun değerlendiriliyor."
            title="Başvurun İnceleniyor"
          />
        ) : null}
        {organizerStatus === "not_applied" || organizerStatus === "rejected" ? (
          <SettingsRow
            icon="ribbon-outline"
            onPress={() => navigation.navigate(ProfileRoutes.OrganizerApplicationScreen)}
            subtitle={
              organizerStatus === "rejected"
                ? "Önceki başvurun reddedildi, tekrar başvurabilirsin."
                : "Topluluğunda etkinlik düzenlemek için başvur."
            }
            title="Organizatör Ol"
          />
        ) : null}

        <View style={styles.sectionDivider} />
        <AppText style={styles.sectionTitle} variant="label">
          Tercihler
        </AppText>
        <SettingsRow
          icon="heart-outline"
          onPress={() => setIsLikesOpen(true)}
          subtitle="Snap ve moment beğenilerin"
          title="Beğenmeler"
        />
        <SettingsRow
          icon="notifications-outline"
          onPress={() => setIsNotificationsOpen(true)}
          subtitle="Mesaj, etkinlik ve yardım bildirimleri"
          title="Bildirimler"
        />
        <SettingsRow
          icon="ban-outline"
          onPress={() => navigation.navigate(ProfileRoutes.BlockedUsersScreen)}
          title="Engellenenler"
        />

        <View style={styles.sectionDivider} />
        <AppText style={styles.sectionTitle} variant="label">
          Destek
        </AppText>
        <SettingsRow
          icon="help-circle-outline"
          onPress={() => setIsHelpOpen(true)}
          subtitle="Yardım istekleri ve topluluk desteği"
          title="Yardım"
        />
        <SettingsRow
          icon="alert-circle-outline"
          onPress={() => navigation.navigate(ProfileRoutes.ReportProblemScreen)}
          title="Sorun bildir"
        />

        <View style={styles.sectionDivider} />
        <AppText style={styles.sectionTitle} variant="label">
          Hesap işlemleri
        </AppText>
        <SettingsRow danger icon="log-out-outline" onPress={() => void signOut()} title="Çıkış yap" />
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setIsAccountManagementOpen(false)} visible={isAccountManagementOpen}>
        <SafeAreaView style={styles.accountSafeArea}>
          <View style={styles.accountTopBar}>
            <Pressable
              onPress={() => {
                if (accountManagementView === "info") {
                  setAccountManagementView("management");
                  return;
                }
                setIsAccountManagementOpen(false);
              }}
              style={styles.backButton}
            >
              <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={26} />
            </Pressable>
            <AppText style={styles.topTitle} variant="label">
              {accountManagementView === "info" ? "Hesap Bilgileri" : "Hesap Yönetimi"}
            </AppText>
            <View style={styles.topSpacer} />
          </View>

          {accountManagementView === "management" ? (
            <ScrollView contentContainerStyle={styles.accountContent} showsVerticalScrollIndicator={false}>
              <AccountMenuRow onPress={() => setAccountManagementView("info")} title="Hesap Bilgileri" />
              <AccountMenuRow subtitle="Yakında" title="Şifre" />
              <AccountMenuRow subtitle="Yakında" title="Doğrulama" />
              <View style={styles.accountSectionDivider} />
              <AccountMenuRow
                danger
                onPress={() => setIsDeleteAccountOpen(true)}
                subtitle="Hesabını geçici olarak dondurabilir veya kalıcı olarak silebilirsin."
                title="Hesabı dondur veya sil"
              />
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.accountContent} showsVerticalScrollIndicator={false}>
              <AccountInfoRow
                rightText={user?.privateProfile.phoneNumber ? "Kayıtlı" : undefined}
                subtitle="Telefon numaran profilinde görüntülenir."
                title="Telefon numarası"
              />
              <AccountInfoRow
                rightText={user?.privateProfile.email ?? undefined}
                subtitle={
                  user?.hasEmailVerification
                    ? "E-posta adresin doğrulandı."
                    : "E-posta adresin henüz doğrulanmadı."
                }
                title="E-posta"
                warning={!user?.hasEmailVerification}
              />
              <AccountInfoRow
                rightText={user?.privateProfile.birthDate || undefined}
                title="Doğum tarihi"
              />
              <AccountInfoRow
                rightText={user?.publicProfile.currentCity || undefined}
                subtitle="Yaşadığın şehir onboarding sırasında belirlenir."
                title="Şehir"
              />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <PlaceholderSheet
        description="Snap ve moment beğenilerin burada listelenecek."
        onClose={() => setIsLikesOpen(false)}
        title="Beğenmeler"
        visible={isLikesOpen}
      />

      <PlaceholderSheet
        description="Push bildirim tercihleri yakında eklenecek."
        onClose={() => setIsNotificationsOpen(false)}
        title="Bildirimler"
        visible={isNotificationsOpen}
      />

      <PlaceholderSheet
        description="Yardım sekmesinden topluluk desteği alabilirsin. Detaylı yardım merkezi yakında."
        onClose={() => setIsHelpOpen(false)}
        title="Yardım"
        visible={isHelpOpen}
      />

      <Modal animationType="fade" onRequestClose={() => setIsDeleteAccountOpen(false)} transparent visible={isDeleteAccountOpen}>
        <View style={styles.deleteBackdrop}>
          <View style={styles.deleteCard}>
            <AppText style={styles.deleteTitle} variant="sectionTitle">
              Hesabı dondur veya sil
            </AppText>
            <AppText style={styles.deleteMessage} variant="bodyMuted">
              Hesabını silmek istediğine emin misin? Bu işlem geri alınamaz.
            </AppText>
            <View style={styles.deleteActions}>
              <Pressable onPress={() => setIsDeleteAccountOpen(false)} style={styles.deleteCancelButton}>
                <AppText style={styles.deleteCancelText} variant="label">
                  Vazgeç
                </AppText>
              </Pressable>
              <Pressable onPress={onConfirmDeleteAccount} style={styles.deleteConfirmButton}>
                <AppText style={styles.deleteConfirmText} variant="label">
                  Sil
                </AppText>
              </Pressable>
            </View>
            <AppText style={styles.deleteHint} variant="caption">
              Hesap silme işlemi yakında aktif olacak.
            </AppText>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  container: {
    paddingBottom: theme.spacing.xxl,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  topTitle: {
    fontSize: 18,
  },
  topSpacer: {
    width: 26,
  },
  sectionDivider: {
    backgroundColor: "#ECEEF2",
    height: 1,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    color: "#6B7280",
    fontSize: 15,
    marginBottom: theme.spacing.xs,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.md,
    minHeight: 58,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xs,
  },
  rowCenter: {
    flex: 1,
  },
  rowTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  rowSubtitle: {
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  rightText: {
    color: theme.colors.textSecondary,
  },
  dangerText: {
    color: theme.colors.danger,
  },
  dangerSubtitle: {
    color: theme.colors.danger,
    opacity: 0.85,
  },
  accountSafeArea: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  accountTopBar: {
    alignItems: "center",
    borderBottomColor: "#ECEEF2",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  accountContent: {
    paddingBottom: theme.spacing.xxl,
  },
  accountSectionDivider: {
    backgroundColor: "#ECEEF2",
    height: 1,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
  },
  accountMenuRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  accountMenuCenter: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  accountMenuTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  accountMenuSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: theme.spacing.xs,
  },
  accountInfoRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  accountInfoRightText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  warningDot: {
    alignItems: "center",
    backgroundColor: "#FF3B30",
    borderRadius: 11,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  sheetSafeArea: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  sheetTopBar: {
    alignItems: "center",
    borderBottomColor: "#ECEEF2",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  sheetBody: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  deleteBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  deleteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    gap: theme.spacing.md,
    maxWidth: 360,
    padding: theme.spacing.lg,
    width: "100%",
  },
  deleteTitle: {
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  deleteMessage: {
    lineHeight: 22,
    textAlign: "center",
  },
  deleteActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  deleteCancelButton: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  deleteCancelText: {
    color: theme.colors.textPrimary,
  },
  deleteConfirmButton: {
    alignItems: "center",
    backgroundColor: theme.colors.danger,
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  deleteConfirmText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  deleteHint: {
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
});
