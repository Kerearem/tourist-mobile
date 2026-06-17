import React from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "../../../components/ui/AppText";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Screen } from "../../../components/ui/Screen";
import { theme } from "../../../constants/theme";

export function BlockedUsersScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Card>
          <AppText variant="sectionTitle">Blocked Users</AppText>
          <AppText variant="bodyMuted">
            People you block will not be able to message you or view your profile interactions.
          </AppText>
        </Card>

        <Card style={styles.emptyCard}>
          <EmptyState
            title="You have not blocked anyone yet"
            description="If needed, you can block users from profile menus across the app."
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: theme.spacing.lg,
  },
  emptyCard: {
    flex: 1,
    justifyContent: "center",
  },
});
