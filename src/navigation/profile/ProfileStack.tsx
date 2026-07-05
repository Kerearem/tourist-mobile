import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ProfileRoutes } from "../../constants/routes";
import { CreateEventScreen } from "../../features/events/screens/CreateEventScreen";
import { CreateMomentScreen } from "../../features/events/screens/CreateMomentScreen";
import { CreateReelScreen } from "../../features/profile/screens/CreateReelScreen";
import { EventAlbumScreen } from "../../features/events/screens/EventAlbumScreen";
import { EventDetailScreen } from "../../features/events/screens/EventDetailScreen";
import { MyOrganizerEventsScreen } from "../../features/events/screens/MyOrganizerEventsScreen";
import { OrganizerApplicationScreen } from "../../features/events/screens/OrganizerApplicationScreen";
import { AccountManagementScreen } from "../../features/profile/screens/AccountManagementScreen";
import { BlockedUsersScreen } from "../../features/profile/screens/BlockedUsersScreen";
import { ChangePasswordScreen } from "../../features/profile/screens/ChangePasswordScreen";
import { DeleteAccountScreen } from "../../features/profile/screens/DeleteAccountScreen";
import { FollowConnectionsScreen } from "../../features/profile/screens/FollowConnectionsScreen";
import { ProfileScreen } from "../../features/profile/screens/ProfileScreen";
import { ReportProblemScreen } from "../../features/profile/screens/ReportProblemScreen";
import { SettingsScreen } from "../../features/profile/screens/SettingsScreen";
import { TokenWalletScreen } from "../../features/token/screens/TokenWalletScreen";
import type { ProfileStackParamList } from "../types";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={ProfileScreen} name={ProfileRoutes.ProfileScreen} />
      <Stack.Screen component={SettingsScreen} name={ProfileRoutes.SettingsScreen} />
      <Stack.Screen component={TokenWalletScreen} name={ProfileRoutes.TokenWalletScreen} />
      <Stack.Screen component={AccountManagementScreen} name={ProfileRoutes.AccountManagementScreen} />
      <Stack.Screen component={ChangePasswordScreen} name={ProfileRoutes.ChangePasswordScreen} />
      <Stack.Screen component={DeleteAccountScreen} name={ProfileRoutes.DeleteAccountScreen} />
      <Stack.Screen component={BlockedUsersScreen} name={ProfileRoutes.BlockedUsersScreen} />
      <Stack.Screen component={FollowConnectionsScreen} name={ProfileRoutes.FollowConnectionsScreen} />
      <Stack.Screen component={ReportProblemScreen} name={ProfileRoutes.ReportProblemScreen} />
      <Stack.Screen component={CreateEventScreen} name={ProfileRoutes.CreateEventScreen} />
      <Stack.Screen component={MyOrganizerEventsScreen} name={ProfileRoutes.MyOrganizerEventsScreen} />
      <Stack.Screen component={OrganizerApplicationScreen} name={ProfileRoutes.OrganizerApplicationScreen} />
      <Stack.Screen component={EventDetailScreen} name={ProfileRoutes.EventDetailScreen} />
      <Stack.Screen component={EventAlbumScreen} name={ProfileRoutes.EventAlbumScreen} />
      <Stack.Screen component={CreateMomentScreen} name={ProfileRoutes.CreateMomentScreen} />
      <Stack.Screen component={CreateReelScreen} name={ProfileRoutes.CreateReelScreen} />
    </Stack.Navigator>
  );
}
