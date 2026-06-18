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
import {
  isValidCountryCode,
  isValidEmail,
  isValidPassword,
  isValidPhoneNumber,
} from "../utils/signup.validation";

type Props = NativeStackScreenProps<AuthStackParamList, "SignupAccountScreen">;

export function SignupAccountScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const { draft, updateDraft } = useSignupDraft();
  const [phoneCountryCode, setPhoneCountryCode] = useState(draft.phoneCountryCode);
  const [phoneNumber, setPhoneNumber] = useState(draft.phoneNumber);
  const [email, setEmail] = useState(draft.email);
  const [password, setPassword] = useState(draft.password);
  const [consentAccepted, setConsentAccepted] = useState(draft.consentAccepted);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    const cleanCountryCode = phoneCountryCode.trim();
    const cleanPhoneNumber = phoneNumber.replace(/\s+/g, "");
    const cleanEmail = email.trim().toLowerCase();

    if (!isValidCountryCode(cleanCountryCode)) {
      setError("Select a valid country code (e.g. +90).");
      return;
    }
    if (!isValidPhoneNumber(cleanPhoneNumber)) {
      setError("Enter a valid phone number.");
      return;
    }
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
      phoneCountryCode: cleanCountryCode,
      phoneNumber: cleanPhoneNumber,
      email: cleanEmail,
      password,
      consentAccepted: true,
    });

    setError("");
    setIsSubmitting(true);
    try {
      await signUp({
        displayName: draft.displayName,
        username: draft.username,
        phoneCountryCode: cleanCountryCode,
        phoneNumber: cleanPhoneNumber,
        email: cleanEmail,
        password,
        birthDate: draft.birthDate,
        consentAccepted: true,
      });
      navigation.reset({
        index: 0,
        routes: [{ name: AuthRoutes.PhoneVerificationScreen }],
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
      subtitle="Add your contact details and secure your account."
      title="Account details"
    >
      <View style={styles.phoneRow}>
        <View style={styles.countryCodeWrap}>
          <AppInput
            keyboardType="phone-pad"
            onChangeText={setPhoneCountryCode}
            placeholder="+90"
            value={phoneCountryCode}
          />
        </View>
        <View style={styles.phoneNumberWrap}>
          <AppInput keyboardType="phone-pad" onChangeText={setPhoneNumber} placeholder="Phone number" value={phoneNumber} />
        </View>
      </View>

      <AppInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        value={email}
      />
      <AppInput onChangeText={setPassword} placeholder="Password" secureTextEntry value={password} />

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
  phoneRow: {
    flexDirection: "row",
    gap: 8,
  },
  countryCodeWrap: {
    width: 96,
  },
  phoneNumberWrap: {
    flex: 1,
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
