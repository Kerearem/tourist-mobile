import React, { useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ScreenBackHeader } from "../../../components/ui/ScreenBackHeader";
import { theme } from "../../../constants/theme";
import { useAuth } from "../../../hooks/useAuth";
import type { ProfileStackParamList } from "../../../navigation/types";
import { EventsTabSegmentControl } from "../components/EventsTabSegmentControl";
import { PersonalEventsList } from "../components/PersonalEventsList";
import {
  ATTENDED_EVENTS_FILTER_SEGMENTS,
  normalizeAttendedEventsFilter,
  type AttendedEventsFilter,
} from "../utils/eventsTabUx";

type Props = NativeStackScreenProps<ProfileStackParamList, "AttendedEventsScreen">;

export function AttendedEventsScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const userContext = useMemo(
    () => ({
      organizerStatus: user?.organizerStatus ?? null,
      accountType: user?.accountType ?? null,
    }),
    [user?.accountType, user?.organizerStatus],
  );
  const [activeFilter, setActiveFilter] = useState<AttendedEventsFilter>(() =>
    normalizeAttendedEventsFilter(route.params?.filter),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pagePadding}>
        <ScreenBackHeader onBack={() => navigation.goBack()} title="Etkinlik Geçmişim" />
        <EventsTabSegmentControl
          activeSection={activeFilter}
          onChange={setActiveFilter}
          segments={ATTENDED_EVENTS_FILTER_SEGMENTS}
        />
      </View>

      <View style={styles.content}>
        <PersonalEventsList
          attendedFilter={activeFilter}
          mode="attended"
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
