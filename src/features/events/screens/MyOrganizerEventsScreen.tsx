import React, { useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { EventsStackParamList, ProfileStackParamList } from "../../../navigation/types";
import { EventsTabSegmentControl } from "../components/EventsTabSegmentControl";
import { PersonalEventsList } from "../components/PersonalEventsList";
import {
  normalizeEventsTabSection,
  resolveEventsTabSegments,
  type EventsTabSection,
} from "../utils/eventsTabUx";

type Props = NativeStackScreenProps<
  EventsStackParamList & ProfileStackParamList,
  "MyOrganizerEventsScreen"
>;

export function MyOrganizerEventsScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const userContext = useMemo(
    () => ({
      organizerStatus: user?.organizerStatus ?? null,
      accountType: user?.accountType ?? null,
    }),
    [user?.accountType, user?.organizerStatus],
  );
  const segments = useMemo(
    () => resolveEventsTabSegments(userContext).filter((segment) => segment.key !== "discover"),
    [userContext],
  );
  const [activeSection, setActiveSection] = useState<"attended" | "created">(() => {
    const initial = normalizeEventsTabSection(route.params?.section, userContext);
    return initial === "created" ? "created" : "attended";
  });

  const onSectionChange = (section: EventsTabSection) => {
    if (section === "attended" || section === "created") {
      setActiveSection(section);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pagePadding}>
        <ScreenBackHeader onBack={() => navigation.goBack()} title="Etkinliklerim" />
        <EventsTabSegmentControl
          activeSection={activeSection}
          onChange={onSectionChange}
          segments={segments}
        />
      </View>

      <View style={styles.content}>
        <PersonalEventsList
          mode={activeSection}
          navigation={navigation}
          userContext={userContext}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  pagePadding: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
});
