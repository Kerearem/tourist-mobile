import React, { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { AuthRoutes } from "../../../constants/routes";
import type { AuthStackParamList } from "../../../navigation/types";
import { SignupFlowLayout } from "../components/SignupFlowLayout";
import { SIGNUP_FLOW_STEPS } from "../constants/signupFlow";
import { useSignupDraft } from "../providers/SignupDraftProvider";
import { isValidUsername } from "../utils/signup.validation";

type Props = NativeStackScreenProps<AuthStackParamList, "SignupUsernameScreen">;

export function SignupUsernameScreen({ navigation }: Props) {
  const { draft, updateDraft } = useSignupDraft();
  const [username, setUsername] = useState(draft.username);
  const [error, setError] = useState("");

  const onContinue = () => {
    const cleanUsername = username.trim().toLowerCase();
    if (!isValidUsername(cleanUsername)) {
      setError("Choose a valid username (3-24 chars, letters/numbers/._).");
      return;
    }

    updateDraft({ username: cleanUsername });
    setError("");
    navigation.navigate(AuthRoutes.SignupAccountScreen);
  };

  return (
    <SignupFlowLayout
      currentStep={SIGNUP_FLOW_STEPS.username}
      error={error}
      onBack={() => navigation.goBack()}
      onPrimaryPress={onContinue}
      primaryLabel="Continue"
      showBack
      subtitle="This will be your unique @handle."
      title="Choose a username"
    >
      <AppInput autoCapitalize="none" autoCorrect={false} onChangeText={setUsername} placeholder="Username" value={username} />
      <AppText muted variant="caption">
        Lowercase letters, numbers, dots and underscores only.
      </AppText>
    </SignupFlowLayout>
  );
}
