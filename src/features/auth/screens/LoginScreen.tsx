import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Screen } from "../../../components/ui/Screen";
import { AuthRoutes } from "../../../constants/routes";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import { useLanguage } from "../../../hooks/useLanguage";
import type { AuthStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "LoginScreen">;

const LANGUAGE_OPTIONS: Array<{ code: "tr" | "fr" | "en" | "de" | "es" | "it"; label: string }> = [
  { code: "tr", label: "Türkçe" },
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
];

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; form?: string }>({});
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  const onSubmit = async () => {
    const cleanIdentifier = identifier.trim();
    const normalizedIdentifier = cleanIdentifier.toLowerCase();
    const nextErrors: { identifier?: string; password?: string; form?: string } = {};
    const isEmailLogin = cleanIdentifier.includes("@");
    const usernameRegex = /^[a-zA-Z0-9._]{3,30}$/;

    if (!cleanIdentifier) {
      nextErrors.identifier = "Email or username is required.";
    } else if (isEmailLogin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentifier)) {
      nextErrors.identifier = "Enter a valid email address.";
    } else if (!isEmailLogin && !usernameRegex.test(cleanIdentifier)) {
      nextErrors.identifier = "Username must be 3-30 chars (letters, numbers, . or _).";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    }

    if (nextErrors.identifier || nextErrors.password) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await signIn({
        identifier: normalizedIdentifier,
        password,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed.";
      setErrors({ form: message || "Invalid credentials. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        {isLanguageMenuOpen ? (
          <Pressable onPress={() => setIsLanguageMenuOpen(false)} style={styles.dropdownBackdrop} />
        ) : null}
        <View style={styles.languageSelectorWrap}>
          <Pressable onPress={() => setIsLanguageMenuOpen((prev) => !prev)} style={styles.languageTrigger}>
            <Ionicons color={theme.colors.textPrimary} name="earth-outline" size={20} />
            <Ionicons color={theme.colors.muted} name={isLanguageMenuOpen ? "chevron-up" : "chevron-down"} size={16} />
          </Pressable>
          {isLanguageMenuOpen ? (
            <View style={styles.languageDropdown}>
              {LANGUAGE_OPTIONS.map((option) => {
                const isActive = language === option.code;
                return (
                  <Pressable
                    key={option.code}
                    onPress={async () => {
                      await setLanguage(option.code);
                      setIsLanguageMenuOpen(false);
                    }}
                    style={styles.languageOption}
                  >
                    <AppText style={styles.languageOptionText}>{option.label}</AppText>
                    {isActive ? <Ionicons color={theme.colors.primary} name="checkmark" size={16} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
        <AppText style={styles.title}>Tourist</AppText>
        <AppText muted style={styles.subtitle}>
          {t("auth.login.welcomeBack")}
        </AppText>

        <AppInput
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.identifier}
          onChangeText={setIdentifier}
          placeholder={t("auth.login.identifierPlaceholder")}
          returnKeyType="next"
          value={identifier}
        />

        <View style={styles.passwordWrap}>
          <AppInput
            error={errors.password}
            onChangeText={setPassword}
            placeholder={t("auth.login.passwordPlaceholder")}
            returnKeyType="done"
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
            value={password}
          />
          <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.visibilityButton}>
            <Ionicons color={theme.colors.muted} name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} />
          </Pressable>
        </View>

        {errors.form ? <AppText style={styles.error}>{errors.form}</AppText> : null}

        <AppButton label={t("auth.login.signIn")} loading={isSubmitting} onPress={onSubmit} />

        <Pressable onPress={() => navigation.navigate(AuthRoutes.SignupDisplayNameScreen)}>
          <AppText muted style={styles.link}>
            {t("auth.login.createAccount")}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    justifyContent: "center",
    position: "relative",
  },
  dropdownBackdrop: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 5,
  },
  languageSelectorWrap: {
    position: "absolute",
    right: 0,
    top: 6,
    zIndex: 6,
  },
  languageTrigger: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E6EAF2",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  languageDropdown: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E6EAF2",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    minWidth: 150,
    paddingVertical: 6,
    shadowColor: "#0B1220",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  languageOption: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  languageOptionText: {
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    marginBottom: 8,
  },
  passwordWrap: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 46,
  },
  visibilityButton: {
    alignItems: "center",
    height: 20,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    top: 14,
    width: 20,
  },
  error: {
    color: "#DC2626",
  },
  link: {
    marginTop: 12,
    textAlign: "center",
  },
});
