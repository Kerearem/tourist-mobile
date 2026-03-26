import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ProfileRoutes } from "../../constants/routes";
import { BlockedUsersScreen } from "../../features/profile/screens/BlockedUsersScreen";
import { ProfileScreen } from "../../features/profile/screens/ProfileScreen";
import { ReportProblemScreen } from "../../features/profile/screens/ReportProblemScreen";
import { SettingsScreen } from "../../features/profile/screens/SettingsScreen";
import type { ProfileStackParamList } from "../types";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen component={ProfileScreen} name={ProfileRoutes.ProfileScreen} />
      <Stack.Screen component={SettingsScreen} name={ProfileRoutes.SettingsScreen} />
      <Stack.Screen component={BlockedUsersScreen} name={ProfileRoutes.BlockedUsersScreen} />
      <Stack.Screen component={ReportProblemScreen} name={ProfileRoutes.ReportProblemScreen} />
    </Stack.Navigator>
  );
}
