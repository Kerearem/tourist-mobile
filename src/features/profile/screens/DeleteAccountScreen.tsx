import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Screen } from "../../../components/ui/Screen";
import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { ProfileStackParamList } from "../../../navigation/types";
import { deleteAccount } from "../services/profile.service";

type Props = NativeStackScreenProps<ProfileStackParamList, "DeleteAccountScreen">;

export function DeleteAccountScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const onDelete = () => {
    void (async () => {
      const trimmedPassword = password.trim();
      if (!trimmedPassword) {
        setError("Şifreni girmelisin.");
        return;
      }

      setIsDeleting(true);
      setError(null);
      try {
        await deleteAccount(trimmedPassword);
        await signOut();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Hesap silinemedi.";
        setError(message);
      } finally {
        setIsDeleting(false);
      }
    })();
  };

  return (
    <Screen scroll>
      <ScreenBackHeader onBack={() => navigation.goBack()} title="Hesabını sil" />
      <View style={styles.content}>
        <AppText style={styles.message} variant="bodyMuted">
          Hesabını silmek üzeresin. 30 gün içinde geri dönebilirsin, sonra kalıcı silinir.
        </AppText>

        <AppInput
          label="Şifren"
          onChangeText={(value) => {
            setPassword(value);
            if (error) {
              setError(null);
            }
          }}
          placeholder="Şifreni gir"
          secureTextEntry
          value={password}
        />

        {error ? (
          <AppText style={styles.error} variant="caption">
            {error}
          </AppText>
        ) : null}

        <AppButton
          disabled={isDeleting}
          label={isDeleting ? "Siliniyor..." : "Hesabımı Sil"}
          loading={isDeleting}
          onPress={onDelete}
          variant="danger"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  message: {
    lineHeight: 22,
  },
  error: {
    color: theme.colors.danger,
    textAlign: "center",
  },
});
