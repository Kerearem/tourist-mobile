import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "../../../components/ui/AppButton";
import { AppText } from "../../../components/ui/AppText";
import { Screen } from "../../../components/ui/Screen";
import { useAuth } from "../../../hooks/useAuth";

export function EmailVerificationScreen() {
  const { completeEmailVerification, signOut } = useAuth();
  const [isConfirmed, setIsConfirmed] = useState(false);

  const onConfirm = async () => {
    setIsConfirmed(true);
    await completeEmailVerification();
  };

  return (
    <Screen>
      <View style={styles.container}>
        <AppText style={styles.title}>Email Verification</AppText>
        <AppText muted style={styles.subtitle}>
          Confirm your email to continue.
        </AppText>
        {isConfirmed ? <AppText muted>Email marked as verified.</AppText> : null}

        <AppButton label="I Verified My Email" onPress={onConfirm} />
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
  secondaryButton: {
    backgroundColor: "#6B7280",
  },
});
