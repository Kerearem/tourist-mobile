import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { FlowProgressBar } from "../../../components/ui/FlowProgressBar";
import { Screen } from "../../../components/ui/Screen";
import { AuthRoutes } from "../../../constants/routes";
import { useAuth } from "../../../hooks/useAuth";
import type { AuthStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "SignupScreen">;

export function SignupScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+90");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValidUsername = (value: string) => {
    if (!/^[a-z0-9._]{3,24}$/.test(value)) {
      return false;
    }
    if (value.startsWith(".") || value.endsWith(".") || value.includes("..")) {
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    const cleanDisplayName = displayName.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanCountryCode = phoneCountryCode.trim();
    const cleanPhoneNumber = phoneNumber.replace(/\s+/g, "");
    const cleanEmail = email.trim().toLowerCase();
    const cleanBirthDate = birthDate.trim();

    if (cleanDisplayName.length < 2) {
      setError("Display name must be at least 2 characters.");
      return;
    }
    if (!isValidUsername(cleanUsername)) {
      setError("Choose a valid username (3-24 chars, letters/numbers/._).");
      return;
    }
    if (!/^\+\d{1,4}$/.test(cleanCountryCode)) {
      setError("Select a valid country code (e.g. +90).");
      return;
    }
    if (!/^\d{7,15}$/.test(cleanPhoneNumber)) {
      setError("Enter a valid phone number.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      setError("Password must be at least 8 characters and include a number.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanBirthDate)) {
      setError("Enter a valid birth date (YYYY-MM-DD).");
      return;
    }
    if (!consentAccepted) {
      setError("You must accept Terms and Privacy Policy.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await signUp({
        displayName: cleanDisplayName,
        username: cleanUsername,
        phoneCountryCode: cleanCountryCode,
        phoneNumber: cleanPhoneNumber,
        email: cleanEmail,
        password,
        birthDate: cleanBirthDate,
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
    <Screen>
      <View style={styles.container}>
        <FlowProgressBar currentStep={1} totalSteps={7} />
        <View style={styles.content}>
          <AppText style={styles.title}>Signup</AppText>
          <AppText muted style={styles.subtitle}>
            Create your Tourist account.
          </AppText>

          <AppInput onChangeText={setDisplayName} placeholder="Display name" value={displayName} />
          <AppInput autoCapitalize="none" onChangeText={setUsername} placeholder="Username" value={username} />

          <View style={styles.phoneRow}>
            <View style={styles.countryCodeWrap}>
              <AppInput keyboardType="phone-pad" onChangeText={setPhoneCountryCode} placeholder="+90" style={styles.countryCodeInput} value={phoneCountryCode} />
            </View>
            <View style={styles.phoneNumberWrap}>
              <AppInput keyboardType="phone-pad" onChangeText={setPhoneNumber} placeholder="Phone number" style={styles.phoneNumberInput} value={phoneNumber} />
            </View>
          </View>

          <AppInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="Email" value={email} />
          <AppInput onChangeText={setPassword} placeholder="Password" secureTextEntry value={password} />
          <AppInput onChangeText={setBirthDate} placeholder="Birth date (YYYY-MM-DD)" value={birthDate} />

          <Pressable onPress={() => setConsentAccepted((prev) => !prev)} style={styles.checkboxRow}>
            <View style={[styles.checkbox, consentAccepted && styles.checkboxChecked]}>
              {consentAccepted ? <Ionicons color="#FFFFFF" name="checkmark" size={14} /> : null}
            </View>
            <AppText muted style={styles.checkboxText}>
              I accept Terms and Privacy Policy.
            </AppText>
          </Pressable>

          {error ? <AppText style={styles.error}>{error}</AppText> : null}

          <AppButton label={isSubmitting ? "Creating..." : "Create Account"} loading={isSubmitting} onPress={onSubmit} />

          <Pressable onPress={() => navigation.navigate(AuthRoutes.LoginScreen)}>
            <AppText muted style={styles.link}>
              Already have an account? Go to Login
            </AppText>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    gap: 12,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    marginBottom: 8,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
  },
  countryCodeInput: {
    width: "100%",
  },
  phoneNumberInput: {
    width: "100%",
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
  error: {
    color: "#DC2626",
  },
  link: {
    marginTop: 12,
    textAlign: "center",
  },
});
