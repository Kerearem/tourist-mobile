import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Screen } from "../../../components/ui/Screen";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { theme } from "../../../constants/theme";
import type { ProfileStackParamList } from "../../../navigation/types";
import { changePassword } from "../../auth/services/auth.service";
import { isValidPassword } from "../../auth/utils/signup.validation";

type Props = NativeStackScreenProps<ProfileStackParamList, "ChangePasswordScreen">;

export function ChangePasswordScreen({ navigation }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!currentPassword.trim()) {
      setError("Mevcut şifreni gir.");
      return;
    }
    if (!isValidPassword(newPassword)) {
      setError("Yeni şifre en az 6 karakter olmalı.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("Yeni şifre mevcut şifreden farklı olmalı.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      Alert.alert("Şifren güncellendi", "Yeni şifrenle giriş yapabilirsin.", [
        {
          text: "Tamam",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Şifre değiştirilemedi.";
      if (message.toLowerCase().includes("mevcut şifre yanlış")) {
        setError("Mevcut şifre yanlış");
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <ScreenBackHeader onBack={() => navigation.goBack()} title="Şifre Değiştir" />
      <View style={styles.content}>
        <AppText muted style={styles.subtitle} variant="bodyMuted">
          Güvenliğin için mevcut şifreni doğrulaman gerekiyor.
        </AppText>

        <AppInput
          label="Mevcut şifre"
          onChangeText={(value) => {
            setCurrentPassword(value);
            if (error) {
              setError(null);
            }
          }}
          placeholder="Mevcut şifren"
          secureTextEntry
          value={currentPassword}
        />

        <AppInput
          label="Yeni şifre"
          onChangeText={(value) => {
            setNewPassword(value);
            if (error) {
              setError(null);
            }
          }}
          placeholder="Yeni şifre"
          secureTextEntry
          value={newPassword}
        />

        <AppInput
          label="Yeni şifre (tekrar)"
          onChangeText={(value) => {
            setConfirmPassword(value);
            if (error) {
              setError(null);
            }
          }}
          placeholder="Yeni şifreyi tekrar gir"
          secureTextEntry
          value={confirmPassword}
        />

        {error ? (
          <AppText style={styles.error} variant="caption">
            {error}
          </AppText>
        ) : null}

        <AppButton
          disabled={isSubmitting}
          label={isSubmitting ? "Kaydediliyor..." : "Şifreyi Değiştir"}
          loading={isSubmitting}
          onPress={() => void onSubmit()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  subtitle: {
    lineHeight: 22,
  },
  error: {
    color: theme.colors.danger,
  },
});
