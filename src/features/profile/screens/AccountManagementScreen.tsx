import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppText } from "../../../components/ui/AppText";
import { Screen } from "../../../components/ui/Screen";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { ProfileRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { ProfileStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<ProfileStackParamList, "AccountManagementScreen">;

type AccountMenuRowProps = {
  title: string;
  subtitle?: string;
  danger?: boolean;
  onPress?: () => void;
};

function AccountMenuRow({ title, subtitle, danger, onPress }: AccountMenuRowProps) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.menuRow}>
      <View style={styles.menuCenter}>
        <AppText style={[styles.menuTitle, danger && styles.dangerText]} variant="body">
          {title}
        </AppText>
        {subtitle ? (
          <AppText style={[styles.menuSubtitle, danger && styles.dangerSubtitle]} variant="caption">
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
    <View style={styles.menuRow}>
      <View style={styles.menuCenter}>
        <AppText style={styles.menuTitle} variant="body">
          {title}
        </AppText>
        {subtitle ? (
          <AppText style={styles.menuSubtitle} variant="caption">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={styles.infoRight}>
        {warning ? (
          <View style={styles.warningDot}>
            <Ionicons color="#FFFFFF" name="alert" size={13} />
          </View>
        ) : null}
        {rightText ? (
          <AppText style={styles.infoRightText} variant="caption">
            {rightText}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export function AccountManagementScreen({ navigation }: Props) {
  const { user, refreshSession } = useAuth();
  const [view, setView] = useState<"management" | "info">("management");

  useFocusEffect(
    useCallback(() => {
      void refreshSession();
    }, [refreshSession]),
  );

  const onBack = () => {
    if (view === "info") {
      setView("management");
      return;
    }
    navigation.goBack();
  };

  return (
    <Screen>
      <ScreenBackHeader
        onBack={onBack}
        title={view === "info" ? "Hesap Bilgileri" : "Hesap Yönetimi"}
      />
      {view === "management" ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <AccountMenuRow onPress={() => setView("info")} title="Hesap Bilgileri" />
          <AccountMenuRow
            onPress={() => navigation.navigate(ProfileRoutes.ChangePasswordScreen)}
            subtitle="Mevcut şifreni girerek güncelle"
            title="Şifre"
          />
          <AccountMenuRow subtitle="Yakında" title="Doğrulama" />
          <View style={styles.sectionDivider} />
          <AccountMenuRow
            danger
            onPress={() => navigation.navigate(ProfileRoutes.DeleteAccountScreen)}
            subtitle="30 gün içinde geri dönebilirsin; sonra kalıcı olarak anonimleştirilir."
            title="Hesabı sil"
          />
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xxl,
  },
  sectionDivider: {
    backgroundColor: "#ECEEF2",
    height: 1,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
  },
  menuRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  menuCenter: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  menuTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  menuSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: theme.spacing.xs,
  },
  dangerText: {
    color: theme.colors.danger,
  },
  dangerSubtitle: {
    color: theme.colors.danger,
    opacity: 0.85,
  },
  infoRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  infoRightText: {
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
