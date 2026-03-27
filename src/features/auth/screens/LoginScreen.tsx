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

type Props = NativeStackScreenProps<AuthStackParamList, "LoginScreen">;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setError("");
    await signIn({
      email: email.trim(),
      password,
    });
  };

  return (
    <Screen>
      <View style={styles.container}>
        <AppText style={styles.title}>Login</AppText>
        <AppText muted style={styles.subtitle}>
          Sign in to continue.
        </AppText>

        <AppInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="Email" value={email} />
        <AppInput onChangeText={setPassword} placeholder="Password" secureTextEntry value={password} />

        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <AppButton label="Sign In" onPress={onSubmit} />

        <Pressable onPress={() => navigation.navigate(AuthRoutes.SignupScreen)}>
          <AppText muted style={styles.link}>
            No account? Go to Signup
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
