import React from "react";
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppText } from "../../../components/ui/AppText";
import { ProfileRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { ProfileStackParamList } from "../../../navigation/types";

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
  onPress?: () => void;
};

function SettingsRow({ icon, title, subtitle, rightText, danger, onPress }: SettingsRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Ionicons color={danger ? theme.colors.danger : theme.colors.textPrimary} name={icon} size={24} />
      <View style={styles.rowCenter}>
        <AppText style={[styles.rowTitle, danger && styles.dangerText]} variant="body">
          {title}
        </AppText>
        {subtitle ? (
          <AppText style={styles.rowSubtitle} numberOfLines={2} variant="caption">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {rightText ? (
        <AppText style={styles.rightText} variant="caption">
          {rightText}
        </AppText>
      ) : (
        <Ionicons color={theme.colors.muted} name="chevron-forward" size={20} />
      )}
    </Pressable>
  );
}

function AccountMenuRow({ title, subtitle, onPress }: AccountMenuRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.accountMenuRow}>
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
      <Ionicons color={theme.colors.muted} name="chevron-forward" size={22} />
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
    <Pressable style={styles.accountMenuRow}>
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
        <Ionicons color={theme.colors.muted} name="chevron-forward" size={22} />
      </View>
    </Pressable>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const [isAccountManagementOpen, setIsAccountManagementOpen] = React.useState(false);
  const [accountManagementView, setAccountManagementView] = React.useState<"management" | "info">("management");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={26} />
          </Pressable>
          <AppText style={styles.topTitle} variant="label">
            Ayarlar ve hareketler
          </AppText>
          <View style={styles.topSpacer} />
        </View>

        <View style={styles.searchWrap}>
          <Ionicons color={theme.colors.muted} name="search" size={20} />
          <TextInput placeholder="Ara" placeholderTextColor={theme.colors.muted} style={styles.searchInput} />
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
          subtitle="Şifre, güvenlik, kişisel detaylar, bağlı deneyimler, reklam tercihleri"
          title="Hesap Yönetimi"
        />

        <View style={styles.sectionDivider} />
        <AppText style={styles.sectionTitle} variant="label">
          Tourist'i nasıl kullanıyorsun?
        </AppText>
        <SettingsRow icon="heart-outline" title="Beğenmeler" />
        <SettingsRow icon="archive-outline" title="Arşiv" />
        <SettingsRow icon="images-outline" title="Hareketlerin" />
        <SettingsRow icon="notifications-outline" title="Bildirimler" />
        <SettingsRow icon="time-outline" title="Zaman yönetimi" />

        <View style={styles.sectionDivider} />
        <AppText style={styles.sectionTitle} variant="label">
          İçeriklerini kimler görebilir?
        </AppText>
        <SettingsRow icon="lock-closed-outline" rightText="Gizli" title="Hesap gizliliği" />
        <SettingsRow
          icon="ban-outline"
          onPress={() => navigation.navigate(ProfileRoutes.BlockedUsersScreen)}
          rightText="0"
          title="Engellenenler"
        />
        <SettingsRow icon="eye-off-outline" title="Hikaye, canlı yayın ve konum" />

        <View style={styles.sectionDivider} />
        <AppText style={styles.sectionTitle} variant="label">
          Daha fazla bilgi ve destek
        </AppText>
        <SettingsRow icon="help-circle-outline" title="Yardım" />
        <SettingsRow icon="person-outline" title="Hesap Durumu" />
        <SettingsRow icon="alert-circle-outline" onPress={() => navigation.navigate(ProfileRoutes.ReportProblemScreen)} title="Sorun bildir" />

        <View style={styles.sectionDivider} />
        <AppText style={styles.sectionTitle} variant="label">
          Giriş yap
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
              <AccountMenuRow title="Şifre" />
              <AccountMenuRow
                subtitle="Face ID veya Touch ID ile Tourist'e giriş yapmak için bir geçiş anahtarı oluşturun. Geçiş anahtarı, şifreden daha güvenlidir."
                title="Geçiş Anahtarı"
              />
              <AccountMenuRow title="Doğrulama" />
              <AccountMenuRow
                subtitle="İzleyicilerle daha iyi bağlantı kuran pazarlama araçlarına ve özel özelliklere erişmek için işletmenizi doğrulayın."
                title="Business verification"
              />
              <AccountMenuRow
                subtitle="Kullandığınız tüm Tourist uygulamalarından verilerinizin kopyasını alın."
                title="Verilerinizi indirin"
              />
              <AccountMenuRow title="Hesabı devre dışı bırakın veya silin" />
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.accountContent} showsVerticalScrollIndicator={false}>
              <AccountInfoRow title="Telefon numarası" />
              <AccountInfoRow
                subtitle="t***l@gmail.com e-posta adresiniz doğrulanmadı."
                title="E-posta"
                warning
              />
              <AccountInfoRow rightText="21 Eyl 2002" title="Doğum tarihi" />
              <AccountInfoRow
                rightText="Türkiye"
                subtitle="Hesap bölgeniz, ilk başta kaydınızın zamanına ve yerine göre belirlenir."
                title="Hesap bölgesi"
              />
            </ScrollView>
          )}
        </SafeAreaView>
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
  searchWrap: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    minHeight: 42,
    paddingHorizontal: theme.spacing.md,
  },
  searchInput: {
    color: theme.colors.textPrimary,
    flex: 1,
    ...theme.typography.body,
  },
  sectionDivider: {
    backgroundColor: "#ECEEF2",
    height: 1,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
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
});
