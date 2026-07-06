import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { AuthRoutes } from "../../../constants/routes";
import { useAuth } from "../../../hooks/useAuth";
import type { AuthStackParamList } from "../../../navigation/types";
import { SignupFlowLayout } from "../components/SignupFlowLayout";
import { SIGNUP_FLOW_STEPS } from "../constants/signupFlow";
import { useSignupDraft } from "../providers/SignupDraftProvider";
import { isValidEmail, isValidPassword } from "../utils/signup.validation";

type Props = NativeStackScreenProps<AuthStackParamList, "SignupAccountScreen">;

export function SignupAccountScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const { draft, updateDraft } = useSignupDraft();
  const [email, setEmail] = useState(draft.email);
  const [password, setPassword] = useState(draft.password);
  const [inviteCode, setInviteCode] = useState(draft.inviteCode ?? "");
  const [consentAccepted, setConsentAccepted] = useState(draft.consentAccepted);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!consentAccepted) {
      setError("You must accept Terms and Privacy Policy.");
      return;
    }

    if (!draft.displayName || !draft.birthDate || !draft.username) {
      setError("Missing signup details. Please go back and complete previous steps.");
      return;
    }

    updateDraft({
      email: cleanEmail,
      password,
      consentAccepted: true,
      inviteCode: inviteCode.trim().toUpperCase(),
    });

    setError("");
    setIsSubmitting(true);
    try {
      const normalizedInviteCode = inviteCode.trim().toUpperCase();
      const result = await signUp({
        displayName: draft.displayName,
        username: draft.username,
        email: cleanEmail,
        password,
        birthDate: draft.birthDate,
        consentAccepted: true,
        ...(normalizedInviteCode ? { inviteCode: normalizedInviteCode } : {}),
      });
      navigation.reset({
        index: 0,
        routes: [
          {
            name: AuthRoutes.EmailVerificationScreen,
            params: result.resumedPendingVerification
              ? {
                  infoMessage:
                    "Bu e-posta için doğrulama bekliyor. Yeni bir doğrulama kodu gönderdik.",
                }
              : undefined,
          },
        ],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SignupFlowLayout
      currentStep={SIGNUP_FLOW_STEPS.account}
      error={error}
      onBack={() => navigation.goBack()}
      onPrimaryPress={onSubmit}
      primaryLabel={isSubmitting ? "Creating..." : "Create Account"}
      primaryLoading={isSubmitting}
      showBack
      subtitle="Add your email and password. We'll send a verification code to your inbox."
      title="Account details"
    >
      <AppInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        value={email}
      />
      <AppInput onChangeText={setPassword} placeholder="Password" secureTextEntry value={password} />

      <AppInput
        autoCapitalize="characters"
        maxLength={6}
        onChangeText={(value) => setInviteCode(value.toUpperCase())}
        placeholder="Davet kodu (isteğe bağlı)"
        value={inviteCode}
      />
      <AppText muted style={styles.inviteHint}>
        Seni davet eden kişinin kodunu gir.
      </AppText>

      <Pressable onPress={() => setConsentAccepted((prev) => !prev)} style={styles.checkboxRow}>
        <View style={[styles.checkbox, consentAccepted && styles.checkboxChecked]}>
          {consentAccepted ? <Ionicons color="#FFFFFF" name="checkmark" size={14} /> : null}
        </View>
        <AppText muted style={styles.checkboxText}>
          I accept Terms and Privacy Policy.
        </AppText>
      </Pressable>
    </SignupFlowLayout>
  );
}

const styles = StyleSheet.create({
  inviteHint: {
    marginTop: -4,
  },
  checkboxRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  checkbox: {
    alignItems: "center",
    borderColor: "#D1D5DB",
    borderRadius: 6,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  checkboxChecked: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  checkboxText: {
    flex: 1,
  },
});
