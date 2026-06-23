import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
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
import { AccountPendingDeletionError } from "../services/auth.service";

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
  const { signIn, requestRestoreAccount, verifyRestoreAccount } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; form?: string }>({});
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{ identifier: string; password: string } | null>(null);
  const [restoreStep, setRestoreStep] = useState<"confirm" | "verify">("confirm");
  const [restoreEmail, setRestoreEmail] = useState("");
  const [restoreCode, setRestoreCode] = useState("");
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreExpiresInSec, setRestoreExpiresInSec] = useState(600);
  const [restoreResendInSec, setRestoreResendInSec] = useState(30);

  useEffect(() => {
    if (restoreStep !== "verify" || !pendingRestore) {
      return;
    }

    const timer = setInterval(() => {
      setRestoreExpiresInSec((prev) => Math.max(0, prev - 1));
      setRestoreResendInSec((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingRestore, restoreStep]);

  const restoreExpireLabel = useMemo(() => {
    const min = Math.floor(restoreExpiresInSec / 60);
    const sec = restoreExpiresInSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }, [restoreExpiresInSec]);

  const closeRestoreModal = () => {
    setPendingRestore(null);
    setRestoreStep("confirm");
    setRestoreEmail("");
    setRestoreCode("");
    setRestoreError(null);
    setRestoreExpiresInSec(600);
    setRestoreResendInSec(30);
  };

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
      if (err instanceof AccountPendingDeletionError) {
        setPendingRestore({ identifier: normalizedIdentifier, password });
        return;
      }
      const message = err instanceof Error ? err.message : "Sign in failed.";
      setErrors({ form: message || "Invalid credentials. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onRequestRestore = async () => {
    if (!pendingRestore) {
      return;
    }

    setIsRestoring(true);
    setRestoreError(null);
    try {
      const result = await requestRestoreAccount(pendingRestore);
      setRestoreEmail(result.email);
      setRestoreStep("verify");
      setRestoreCode("");
      setRestoreExpiresInSec(600);
      setRestoreResendInSec(30);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Doğrulama kodu gönderilemedi.";
      setRestoreError(message);
    } finally {
      setIsRestoring(false);
    }
  };

  const onVerifyRestore = async () => {
    if (!pendingRestore) {
      return;
    }

    const cleanCode = restoreCode.replace(/\D+/g, "").slice(0, 6);
    if (cleanCode.length !== 6) {
      setRestoreError("6 haneli doğrulama kodunu gir.");
      return;
    }

    if (restoreExpiresInSec === 0) {
      setRestoreError("Kodun süresi doldu. Yeniden kod gönder.");
      return;
    }

    setIsRestoring(true);
    setRestoreError(null);
    try {
      await verifyRestoreAccount({
        ...pendingRestore,
        code: cleanCode,
      });
      closeRestoreModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Hesap geri getirilemedi.";
      setRestoreError(message);
    } finally {
      setIsRestoring(false);
    }
  };

  const onResendRestoreCode = async () => {
    if (!pendingRestore || restoreResendInSec > 0 || isRestoring) {
      return;
    }

    setIsRestoring(true);
    setRestoreError(null);
    try {
      await requestRestoreAccount(pendingRestore);
      setRestoreCode("");
      setRestoreExpiresInSec(600);
      setRestoreResendInSec(30);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Kod tekrar gönderilemedi.";
      if (message.toLowerCase().includes("once per minute") || message.toLowerCase().includes("too many")) {
        setRestoreError("Çok sık denediniz, biraz bekleyin.");
      } else {
        setRestoreError(message);
      }
    } finally {
      setIsRestoring(false);
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

      <Modal
        animationType="fade"
        onRequestClose={closeRestoreModal}
        transparent
        visible={pendingRestore !== null}
      >
        <View style={styles.restoreBackdrop}>
          <View style={styles.restoreCard}>
            {restoreStep === "confirm" ? (
              <>
                <AppText style={styles.restoreTitle} variant="sectionTitle">
                  Hesabın silinmek üzere
                </AppText>
                <AppText style={styles.restoreMessage} variant="bodyMuted">
                  30 gün içinde geri getirebilirsin. Hesabını yeniden açmak ister misin?
                </AppText>
                {restoreError ? (
                  <AppText style={styles.restoreError} variant="caption">
                    {restoreError}
                  </AppText>
                ) : null}
                <View style={styles.restoreActions}>
                  <Pressable disabled={isRestoring} onPress={closeRestoreModal} style={styles.restoreCancelButton}>
                    <AppText style={styles.restoreCancelText} variant="label">
                      Hayır
                    </AppText>
                  </Pressable>
                  <Pressable
                    disabled={isRestoring}
                    onPress={() => void onRequestRestore()}
                    style={styles.restoreConfirmButton}
                  >
                    <AppText style={styles.restoreConfirmText} variant="label">
                      {isRestoring ? "Gönderiliyor..." : "Evet, geri getir"}
                    </AppText>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <AppText style={styles.restoreTitle} variant="sectionTitle">
                  E-posta doğrulama
                </AppText>
                <AppText style={styles.restoreMessage} variant="bodyMuted">
                  Hesabını geri getirmek için {restoreEmail || "e-posta adresine"} kod gönderdik.
                </AppText>
                <AppInput
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={(value) => {
                    setRestoreCode(value.replace(/\D+/g, "").slice(0, 6));
                    if (restoreError) {
                      setRestoreError(null);
                    }
                  }}
                  placeholder="6 haneli kod"
                  value={restoreCode}
                />
                <View style={styles.restoreMetaRow}>
                  <AppText muted variant="caption">
                    Kod geçerliliği: {restoreExpireLabel}
                  </AppText>
                  <AppButton
                    containerStyle={[
                      styles.restoreResendButton,
                      restoreResendInSec > 0 && styles.restoreResendButtonDisabled,
                    ]}
                    disabled={restoreResendInSec > 0 || isRestoring}
                    label={
                      restoreResendInSec > 0
                        ? `${restoreResendInSec} sn sonra tekrar gönder`
                        : isRestoring
                          ? "Gönderiliyor..."
                          : "Kodu tekrar gönder"
                    }
                    onPress={() => void onResendRestoreCode()}
                    variant="secondary"
                  />
                </View>
                {restoreError ? (
                  <AppText style={styles.restoreError} variant="caption">
                    {restoreError}
                  </AppText>
                ) : null}
                <View style={styles.restoreActions}>
                  <Pressable
                    disabled={isRestoring}
                    onPress={() => {
                      setRestoreStep("confirm");
                      setRestoreCode("");
                      setRestoreError(null);
                    }}
                    style={styles.restoreCancelButton}
                  >
                    <AppText style={styles.restoreCancelText} variant="label">
                      Geri
                    </AppText>
                  </Pressable>
                  <Pressable
                    disabled={isRestoring}
                    onPress={() => void onVerifyRestore()}
                    style={styles.restoreConfirmButton}
                  >
                    <AppText style={styles.restoreConfirmText} variant="label">
                      {isRestoring ? "Doğrulanıyor..." : "Doğrula"}
                    </AppText>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  restoreBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(17, 24, 39, 0.45)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  restoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    gap: theme.spacing.md,
    maxWidth: 360,
    padding: theme.spacing.lg,
    width: "100%",
  },
  restoreTitle: {
    textAlign: "center",
  },
  restoreMessage: {
    lineHeight: 22,
    textAlign: "center",
  },
  restoreActions: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  restoreCancelButton: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  restoreCancelText: {
    color: theme.colors.textPrimary,
  },
  restoreConfirmButton: {
    alignItems: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  restoreConfirmText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  restoreError: {
    color: theme.colors.danger,
    textAlign: "center",
  },
  restoreMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  restoreResendButton: {
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  restoreResendButtonDisabled: {
    opacity: 0.7,
  },
});
