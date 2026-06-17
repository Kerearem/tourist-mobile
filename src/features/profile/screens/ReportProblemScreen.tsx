import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { ListItem } from "../../../components/ui/ListItem";
import { Screen } from "../../../components/ui/Screen";
import { theme } from "../../../constants/theme";

const supportTopics = [
  "Login and account access",
  "Messages and conversations",
  "Events participation",
  "Help requests",
] as const;

export function ReportProblemScreen() {
  const [message, setMessage] = useState("");

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Card>
          <AppText variant="sectionTitle">Report a Problem</AppText>
          <AppText variant="bodyMuted">
            Share what went wrong and the support team will review it. This form is UI-only in this phase.
          </AppText>
        </Card>

        <Card>
          <AppText style={styles.topicTitle} variant="label">
            Popular Support Topics
          </AppText>
          {supportTopics.map((topic) => (
            <ListItem key={topic} title={topic} />
          ))}
        </Card>

        <Card>
          <AppInput
            label="Describe your issue"
            multiline
            onChangeText={setMessage}
            placeholder="Tell us what happened..."
            style={styles.input}
            value={message}
          />
          <AppButton label="Submit Report" onPress={() => {}} />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  topicTitle: {
    marginBottom: theme.spacing.sm,
  },
  input: {
    marginBottom: theme.spacing.md,
    minHeight: 120,
    textAlignVertical: "top",
  },
});
