import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppButton } from "../../../components/ui/AppButton";
import { AppInput } from "../../../components/ui/AppInput";
import { AppText } from "../../../components/ui/AppText";
import { Badge } from "../../../components/ui/Badge";
import { Card } from "../../../components/ui/Card";
import { Screen } from "../../../components/ui/Screen";
import { theme } from "../../../constants/theme";

export function CreateEventScreen() {
  const [title, setTitle] = useState("");
  const [dateText, setDateText] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Card style={styles.introCard}>
          <AppText variant="title">Create Event</AppText>
          <AppText variant="bodyMuted">
            Plan a simple community meet-up. This screen is a UI scaffold and creation workflow will be wired in a later
            phase.
          </AppText>
          <View style={styles.badges}>
            <Badge label="Organizer flow" />
            <Badge label="UI scaffold" />
          </View>
        </Card>

        <Card style={styles.formCard}>
          <AppInput label="Event title" onChangeText={setTitle} placeholder="Berlin Turkish Coffee Meetup" value={title} />
          <AppInput label="Date and time" onChangeText={setDateText} placeholder="Sat, 18 Apr - 18:30" value={dateText} />
          <AppInput label="Location" onChangeText={setLocation} placeholder="Kreuzberg, Berlin" value={location} />
          <AppInput
            label="Description"
            multiline
            numberOfLines={4}
            onChangeText={setDescription}
            placeholder="Tell people what to expect and who should join."
            style={styles.textarea}
            textAlignVertical="top"
            value={description}
          />
          <AppButton label="Submit Event (Coming Soon)" variant="secondary" />
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
  introCard: {
    gap: theme.spacing.sm,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  formCard: {
    gap: theme.spacing.md,
  },
  textarea: {
    minHeight: 110,
  },
});
