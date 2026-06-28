import React, { useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Screen } from "../../../components/ui/Screen";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { AuthRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import type { AuthStackParamList } from "../../../navigation/types";
import { requestForgotPassword, verifyForgotPassword } from "../services/auth.service";
import { isValidPassword } from "../utils/signup.validation";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPasswordScreen">;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const email = route.params.email;
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState("E-posta adresine 6 haneli sıfırlama kodu gönderdik.");
  const [expiresInSec, setExpiresInSec] = useState(900);
  const [resendInSec, setResendInSec] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setExpiresInSec((prev) => Math.max(0, prev - 1));
      setResendInSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const expireLabel = useMemo(() => {
    const min = Math.floor(expiresInSec / 60);
    const sec = expiresInSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }, [expiresInSec]);

  const onSubmit = async () => {
    const cleanCode = code.replace(/\D+/g, "").slice(0, 6);
    if (cleanCode.length !== 6) {
      setError("6 haneli doğrulama kodunu gir.");
      return;
    }
    if (!isValidPassword(newPassword)) {
      setError("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (expiresInSec === 0) {
      setError("Kodun süresi doldu. Yeni kod iste.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await verifyForgotPassword({ email, code: cleanCode, newPassword });
      Alert.alert("Şifre güncellendi", "Yeni şifrenle giriş yapabilirsin.", [
        {
          text: "Tamam",
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [{ name: AuthRoutes.LoginScreen }],
            }),
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Şifre sıfırlanamadı.";
      if (message.toLowerCase().includes("invalid or expired")) {
        setError("Geçersiz veya süresi dolmuş doğrulama kodu.");
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResend = async () => {
    if (resendInSec > 0 || isResending) {
      return;
    }

    setIsResending(true);
    setError(null);
    try {
      await requestForgotPassword(email);
      setCode("");
      setInfo("Yeni sıfırlama kodu gönderildi.");
      setExpiresInSec(900);
      setResendInSec(30);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kod tekrar gönderilemedi.";
      if (message.toLowerCase().includes("once per minute") || message.toLowerCase().includes("too many")) {
        setError("Çok sık denediniz, biraz bekleyin.");
      } else {
        setError(message);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Screen>
      <ScreenBackHeader onBack={() => navigation.goBack()} title="Yeni Şifre" />
      <View style={styles.content}>
        <AppText muted style={styles.subtitle} variant="bodyMuted">
          {info}
        </AppText>
        <AppText style={styles.emailLabel} variant="label">
          {email}
        </AppText>

        <AppInput
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={(value) => {
            setCode(value.replace(/\D+/g, "").slice(0, 6));
            if (error) {
              setError(null);
            }
          }}
          placeholder="6 haneli kod"
          value={code}
        />

        <AppInput
          onChangeText={setNewPassword}
          placeholder="Yeni şifre"
          secureTextEntry
          value={newPassword}
        />

        <View style={styles.metaRow}>
          <AppText muted variant="caption">
            Kod geçerliliği: {expireLabel}
          </AppText>
          <AppButton
            containerStyle={[styles.resendButton, resendInSec > 0 && styles.resendButtonDisabled]}
            disabled={resendInSec > 0 || isResending}
            label={
              resendInSec > 0
                ? `${resendInSec} sn sonra tekrar gönder`
                : isResending
                  ? "Gönderiliyor..."
                  : "Kodu tekrar gönder"
            }
            onPress={() => void onResend()}
            variant="secondary"
          />
        </View>

        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <AppButton label={isSubmitting ? "Kaydediliyor..." : "Şifreyi Sıfırla"} loading={isSubmitting} onPress={() => void onSubmit()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: theme.spacing.md,
    paddingTop: theme.spacing.lg,
  },
  subtitle: {
    lineHeight: 22,
  },
  emailLabel: {
    color: theme.colors.textPrimary,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  resendButton: {
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resendButtonDisabled: {
    opacity: 0.7,
  },
  error: {
    color: theme.colors.danger,
  },
});
