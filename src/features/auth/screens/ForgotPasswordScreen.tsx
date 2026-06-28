import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Screen } from "../../../components/ui/Screen";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { AuthRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import type { AuthStackParamList } from "../../../navigation/types";
import { requestForgotPassword } from "../services/auth.service";
import { isValidEmail } from "../utils/signup.validation";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPasswordScreen">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      setError("Geçerli bir e-posta adresi gir.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await requestForgotPassword(cleanEmail);
      navigation.navigate(AuthRoutes.ResetPasswordScreen, { email: cleanEmail });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kod gönderilemedi.";
      if (message.toLowerCase().includes("once per minute") || message.toLowerCase().includes("too many")) {
        setError("Çok sık denediniz, biraz bekleyin.");
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScreenBackHeader onBack={() => navigation.goBack()} title="Şifremi Unuttum" />
      <View style={styles.content}>
        <AppText muted style={styles.subtitle} variant="bodyMuted">
          E-posta adresini gir. Hesabın varsa sıfırlama kodu göndereceğiz.
        </AppText>

        <AppInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={(value) => {
            setEmail(value);
            if (error) {
              setError(null);
            }
          }}
          placeholder="E-posta"
          value={email}
        />

        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <AppButton
          label={isSubmitting ? "Gönderiliyor..." : "Sıfırlama Kodu Gönder"}
          loading={isSubmitting}
          onPress={() => void onSubmit()}
        />
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
  error: {
    color: theme.colors.danger,
  },
});
