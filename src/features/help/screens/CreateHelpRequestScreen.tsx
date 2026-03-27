import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Screen } from "../../../components/ui/Screen";
import { HelpRoutes } from "../../../constants/routes";
import { useAuth } from "../../../hooks/useAuth";
import type { HelpStackParamList } from "../../../navigation/types";
import { createHelpRequest } from "../services/help.service";

type Props = NativeStackScreenProps<HelpStackParamList, "CreateHelpRequestScreen">;

export function CreateHelpRequestScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }

    if (!user) {
      setError("No active user.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    await createHelpRequest({
      author: {
        id: user.id,
        displayName: user.displayName,
      },
      community: user.community,
      countryCode: user.currentCountryCode,
      city: user.currentCity,
      title,
      description,
    });
    setIsSubmitting(false);

    navigation.navigate(HelpRoutes.HelpListScreen, {
      refreshToken: `${Date.now()}`,
    });
  };

  return (
    <Screen scroll>
      <View style={styles.container}>
        <AppText style={styles.title}>Create Help Request</AppText>
        <AppText muted style={styles.subtitle}>
          Explain what you need so community members can help.
        </AppText>

        <AppInput onChangeText={setTitle} placeholder="Title" value={title} />
        <AppInput
          multiline
          onChangeText={setDescription}
          placeholder="Describe your request"
          style={styles.descriptionInput}
          value={description}
        />

        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <AppButton label={isSubmitting ? "Submitting..." : "Submit Request"} onPress={() => void onSubmit()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 12,
  },
  subtitle: {
    marginBottom: 8,
  },
  descriptionInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  error: {
    color: "#DC2626",
  },
});
