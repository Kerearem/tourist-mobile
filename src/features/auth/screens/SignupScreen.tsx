import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Screen } from "../../../components/ui/Screen";
import { AuthRoutes } from "../../../constants/routes";
import { useAuth } from "../../../hooks/useAuth";
import type { AuthStackParamList } from "../../../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "SignupScreen">;

export function SignupScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async () => {
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      setError("Display name, email, and password are required.");
      return;
    }

    setError("");
    await signUp({
      displayName: displayName.trim(),
      email: email.trim(),
      password,
    });
  };

  return (
    <Screen>
      <View style={styles.container}>
        <AppText style={styles.title}>Signup</AppText>
        <AppText muted style={styles.subtitle}>
          Create your Tourist account.
        </AppText>

        <AppInput onChangeText={setDisplayName} placeholder="Display name" value={displayName} />
        <AppInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="Email" value={email} />
        <AppInput onChangeText={setPassword} placeholder="Password" secureTextEntry value={password} />

        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <AppButton label="Create Account" onPress={onSubmit} />

        <Pressable onPress={() => navigation.navigate(AuthRoutes.LoginScreen)}>
          <AppText muted style={styles.link}>
            Already have an account? Go to Login
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
  link: {
    marginTop: 12,
    textAlign: "center",
  },
});
