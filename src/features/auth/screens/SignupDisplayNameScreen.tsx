import React, { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { AuthRoutes } from "../../../constants/routes";
import type { AuthStackParamList } from "../../../navigation/types";
import { SignupFlowLayout } from "../components/SignupFlowLayout";
import { SIGNUP_FLOW_STEPS } from "../constants/signupFlow";
import { useSignupDraft } from "../providers/SignupDraftProvider";

type Props = NativeStackScreenProps<AuthStackParamList, "SignupDisplayNameScreen">;

const buildDisplayName = (firstName: string, lastName: string) => `${firstName.trim()} ${lastName.trim()}`.trim();

export function SignupDisplayNameScreen({ navigation }: Props) {
  const { draft, updateDraft, resetDraft } = useSignupDraft();
  const [firstName, setFirstName] = useState(draft.firstName);
  const [lastName, setLastName] = useState(draft.lastName);
  const [error, setError] = useState("");

  const onContinue = () => {
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const displayName = buildDisplayName(cleanFirstName, cleanLastName);

    if (cleanFirstName.length < 2) {
      setError("First name must be at least 2 characters.");
      return;
    }
    if (cleanLastName.length < 2) {
      setError("Last name must be at least 2 characters.");
      return;
    }

    updateDraft({
      firstName: cleanFirstName,
      lastName: cleanLastName,
      displayName,
    });
    setError("");
    navigation.navigate(AuthRoutes.SignupBirthDateScreen);
  };

  return (
    <SignupFlowLayout
      currentStep={SIGNUP_FLOW_STEPS.displayName}
      error={error}
      footer={
        <Pressable
          onPress={() => {
            resetDraft();
            navigation.navigate(AuthRoutes.LoginScreen);
          }}
        >
          <AppText muted style={styles.link}>
            Already have an account? Go to Login
          </AppText>
        </Pressable>
      }
      onPrimaryPress={onContinue}
      primaryLabel="Continue"
      subtitle="Tell us your first and last name."
      title="What's your name?"
    >
      <AppInput autoCapitalize="words" onChangeText={setFirstName} placeholder="First name" value={firstName} />
      <AppInput autoCapitalize="words" onChangeText={setLastName} placeholder="Last name" value={lastName} />
    </SignupFlowLayout>
  );
}

const styles = StyleSheet.create({
  link: {
    marginTop: 12,
    textAlign: "center",
  },
});
