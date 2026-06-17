import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { Screen } from "../../../components/ui/Screen";
import { theme } from "../../../constants/theme";

export function OrganizerApplicationScreen() {
  const [motivation, setMotivation] = useState("");

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Card style={styles.card}>
          <AppText variant="title">Become an Organizer</AppText>
          <AppText variant="bodyMuted">
            Organizers help their community discover safe, useful, and social events in their city.
          </AppText>
          <View style={styles.badges}>
            <Badge label="Community role" />
            <Badge label="Trust and safety" />
          </View>
        </Card>

        <Card style={styles.card}>
          <AppText variant="sectionTitle">What this role includes</AppText>
          <AppText variant="bodyMuted">- Hosting respectful community events</AppText>
          <AppText variant="bodyMuted">- Keeping event details clear and accurate</AppText>
          <AppText variant="bodyMuted">- Supporting newcomers in your city</AppText>
        </Card>

        <Card style={styles.card}>
          <AppText variant="sectionTitle">Why do you want to organize?</AppText>
          <AppInput
            multiline
            numberOfLines={5}
            onChangeText={setMotivation}
            placeholder="Share your motivation and the kind of events you want to host."
            style={styles.textarea}
            textAlignVertical="top"
            value={motivation}
          />
          <AppButton label="Submit Application (Coming Soon)" variant="secondary" />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  card: {
    gap: theme.spacing.sm,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  textarea: {
    minHeight: 120,
  },
});
