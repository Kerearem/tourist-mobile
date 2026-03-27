import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Screen } from "../../../components/ui/Screen";
import { useAuth } from "../../../hooks/useAuth";

export function PhoneVerificationScreen() {
  const { completePhoneVerification, signOut } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const onConfirm = async () => {
    if (!code.trim()) {
      setError("Enter the verification code.");
      return;
    }

    setError("");
    await completePhoneVerification();
  };

  return (
    <Screen>
      <View style={styles.container}>
        <AppText style={styles.title}>Phone Verification</AppText>
        <AppText muted style={styles.subtitle}>
          Enter the code sent to your phone.
        </AppText>

        <AppInput keyboardType="number-pad" onChangeText={setCode} placeholder="Verification code" value={code} />
        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <AppButton label="Confirm Phone" onPress={onConfirm} />
        <AppButton containerStyle={styles.secondaryButton} label="Sign Out" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
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
  error: {
    color: "#DC2626",
  },
  secondaryButton: {
    backgroundColor: "#6B7280",
  },
});
