import React, { useCallback, useRef } from "react";
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
import {
  buildAvailableCreateSubtitle,
  buildCapabilityUsageLabel,
  buildEventLimitMessage,
  buildRemainingSlotsLabel,
  formatCapabilityLevelLabel,
  resolveOrganizerCapabilityLoadFailureMessage,
  toActiveEventCheckReadyState,
  type ActiveEventCheckState,
} from "../../events/utils/organizerCapabilityStatus";

type Props = NativeStackScreenProps<ProfileStackParamList, "SettingsScreen">;

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  rightText?: string;
  danger?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

function SettingsRow({ icon, title, subtitle, rightText, danger, disabled, onPress }: SettingsRowProps) {
  return (
    <Pressable disabled={disabled || !onPress} onPress={onPress} style={[styles.row, disabled && styles.rowDisabled]}>
      <Ionicons color={danger ? theme.colors.danger : theme.colors.textPrimary} name={icon} size={24} />
      <View style={styles.rowCenter}>
        <AppText style={[styles.rowTitle, danger && styles.dangerText, disabled && styles.rowTitleDisabled]} variant="body">
          {title}
        </AppText>
        {subtitle ? (
          <AppText numberOfLines={3} style={styles.rowSubtitle} variant="caption">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {rightText ? (
        <AppText style={styles.rightText} variant="caption">
          {rightText}
        </AppText>
      ) : onPress && !disabled ? (
        <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
      ) : null}
    </Pressable>
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
  const [capabilityState, setCapabilityState] = React.useState<ActiveEventCheckState>({ status: "loading" });
  const capabilityRequestRef = useRef(0);
  const [isLikesOpen, setIsLikesOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);

  const loadOrganizerCapabilities = useCallback(async () => {
    const requestId = ++capabilityRequestRef.current;
    setCapabilityState({ status: "loading" });

    try {
      const status = await getOrganizerStatus();
      if (requestId !== capabilityRequestRef.current) {
        return;
      }

      setCapabilityState(toActiveEventCheckReadyState(status));
    } catch {
      if (requestId !== capabilityRequestRef.current) {
        return;
      }

      setCapabilityState({
        status: "error",
        message: resolveOrganizerCapabilityLoadFailureMessage(),
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshSession();
      void loadOrganizerCapabilities();

      return () => {
        capabilityRequestRef.current += 1;
      };
    }, [loadOrganizerCapabilities, refreshSession]),
  );

  const organizerStatus = user?.organizerStatus ?? "not_applied";
  const readyCapabilityState = capabilityState.status === "ready" ? capabilityState : null;

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
          onPress={() => navigation.navigate(ProfileRoutes.AccountManagementScreen)}
          subtitle="Şifre, güvenlik ve kişisel bilgiler"
          title="Hesap Yönetimi"
        />

        {user?.accountType !== "business" ? (
          <>
            <View style={styles.sectionDivider} />
            <AppText style={styles.sectionTitle} variant="label">
              Cüzdan
            </AppText>
            <SettingsRow
              icon="wallet-outline"
              onPress={() => navigation.navigate(ProfileRoutes.TokenWalletScreen)}
              subtitle="Token bakiyen ve satın alma"
              title="Cüzdanım"
            />
          </>
        ) : null}

        {organizerStatus === "approved" || user?.accountType === "business" ? (
          <>
            <View style={styles.sectionDivider} />
            <AppText style={styles.sectionTitle} variant="label">
              Finans
            </AppText>
            <SettingsRow
              icon="cash-outline"
              onPress={() => navigation.navigate(ProfileRoutes.FinanceScreen)}
              subtitle="Kazançların ve para çekme"
              title="Finans"
            />
          </>
        ) : null}

        <View style={styles.sectionDivider} />
        <AppText style={styles.sectionTitle} variant="label">
          Organizatör
        </AppText>
        {organizerStatus === "approved" ? (
          <>
            {capabilityState.status === "loading" ? (
              <SettingsRow icon="hourglass-outline" title="Etkinlik hakları yükleniyor..." />
            ) : null}

            {capabilityState.status === "error" ? (
              <>
                <SettingsRow
                  icon="alert-circle-outline"
                  subtitle={capabilityState.message}
                  title="Etkinlik hakları yüklenemedi"
                />
                <SettingsRow icon="refresh-outline" onPress={() => void loadOrganizerCapabilities()} title="Tekrar dene" />
              </>
            ) : null}

            {readyCapabilityState ? (
              <>
                <SettingsRow
                  icon="ribbon-outline"
                  rightText={formatCapabilityLevelLabel(readyCapabilityState.capabilityLevel)}
                  subtitle={buildCapabilityUsageLabel(
                    readyCapabilityState.usage,
                    readyCapabilityState.capabilities.maxConcurrentActiveEvents,
                  )}
                  title="Organizatör seviyesi"
                />
                <SettingsRow
                  icon="stats-chart-outline"
                  subtitle={buildRemainingSlotsLabel(readyCapabilityState.usage.remainingActiveEventSlots)}
                  title="Aktif etkinlik kullanımı"
                />
                {readyCapabilityState.usage.remainingActiveEventSlots > 0 ? (
                  <SettingsRow
                    icon="add-circle-outline"
                    onPress={() => navigation.push(ProfileRoutes.CreateEventScreen)}
                    subtitle={buildAvailableCreateSubtitle(
                      readyCapabilityState.usage,
                      readyCapabilityState.capabilities.maxConcurrentActiveEvents,
                    )}
                    title="Etkinlik Oluştur"
                  />
                ) : (
                  <SettingsRow
                    disabled
                    icon="remove-circle-outline"
                    subtitle={
                      readyCapabilityState.activeEventTitle
                        ? `${buildEventLimitMessage(
                            readyCapabilityState.capabilityLevel,
                            readyCapabilityState.capabilities.maxConcurrentActiveEvents,
                          )} Yakın etkinlik: ${readyCapabilityState.activeEventTitle}`
                        : buildEventLimitMessage(
                            readyCapabilityState.capabilityLevel,
                            readyCapabilityState.capabilities.maxConcurrentActiveEvents,
                          )
                    }
                    title="Etkinlik limitine ulaştın"
                  />
                )}
              </>
            ) : null}

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
            onPress={() => navigation.navigate(ProfileRoutes.OrganizerApplicationScreen)}
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
          Bağlantılar
        </AppText>
        <SettingsRow
          icon="people-outline"
          onPress={() =>
            navigation.navigate(ProfileRoutes.FollowConnectionsScreen, { listType: "following" })
          }
          title="Takip Ettiklerim"
        />
        <SettingsRow
          icon="person-add-outline"
          onPress={() =>
            navigation.navigate(ProfileRoutes.FollowConnectionsScreen, { listType: "followers" })
          }
          title="Takipçilerim"
        />
        <SettingsRow
          icon="heart-circle-outline"
          onPress={() => navigation.navigate(ProfileRoutes.FollowConnectionsScreen, { listType: "friends" })}
          title="Arkadaşlarım"
        />

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
  rowDisabled: {
    opacity: 0.72,
  },
  rowCenter: {
    flex: 1,
  },
  rowTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  rowTitleDisabled: {
    color: theme.colors.textSecondary,
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
});
