import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ProfileRoutes } from "../../constants/routes";
import { CreateEventScreen } from "../../features/events/screens/CreateEventScreen";
import { EventDetailScreen } from "../../features/events/screens/EventDetailScreen";
import { MyOrganizerEventsScreen } from "../../features/events/screens/MyOrganizerEventsScreen";
import { OrganizerApplicationScreen } from "../../features/events/screens/OrganizerApplicationScreen";
import { AccountManagementScreen } from "../../features/profile/screens/AccountManagementScreen";
import { BlockedUsersScreen } from "../../features/profile/screens/BlockedUsersScreen";
import { DeleteAccountScreen } from "../../features/profile/screens/DeleteAccountScreen";
import { ProfileScreen } from "../../features/profile/screens/ProfileScreen";
import { ReportProblemScreen } from "../../features/profile/screens/ReportProblemScreen";
import { SettingsScreen } from "../../features/profile/screens/SettingsScreen";
import type { ProfileStackParamList } from "../types";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={ProfileScreen} name={ProfileRoutes.ProfileScreen} />
      <Stack.Screen component={SettingsScreen} name={ProfileRoutes.SettingsScreen} />
      <Stack.Screen component={AccountManagementScreen} name={ProfileRoutes.AccountManagementScreen} />
      <Stack.Screen component={DeleteAccountScreen} name={ProfileRoutes.DeleteAccountScreen} />
      <Stack.Screen component={BlockedUsersScreen} name={ProfileRoutes.BlockedUsersScreen} />
      <Stack.Screen component={ReportProblemScreen} name={ProfileRoutes.ReportProblemScreen} />
      <Stack.Screen component={CreateEventScreen} name={ProfileRoutes.CreateEventScreen} />
      <Stack.Screen component={MyOrganizerEventsScreen} name={ProfileRoutes.MyOrganizerEventsScreen} />
      <Stack.Screen component={OrganizerApplicationScreen} name={ProfileRoutes.OrganizerApplicationScreen} />
      <Stack.Screen component={EventDetailScreen} name={ProfileRoutes.EventDetailScreen} />
    </Stack.Navigator>
  );
}
