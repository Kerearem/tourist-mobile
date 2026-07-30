import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ProfileRoutes } from "../../constants/routes";
import { CreateEventScreen } from "../../features/events/screens/CreateEventScreen";
import { CreateMomentScreen } from "../../features/events/screens/CreateMomentScreen";
import { CreateReelScreen } from "../../features/profile/screens/CreateReelScreen";
import { EventAlbumScreen } from "../../features/events/screens/EventAlbumScreen";
import { AttendedEventsScreen } from "../../features/events/screens/AttendedEventsScreen";
import { EventAttendanceQrScreen } from "../../features/events/screens/EventAttendanceQrScreen";
import { EventDetailScreen } from "../../features/events/screens/EventDetailScreen";
import { EventQrScannerScreen } from "../../features/events/screens/EventQrScannerScreen";
import { MyOrganizerEventsScreen } from "../../features/events/screens/MyOrganizerEventsScreen";
import { OrganizerApplicationScreen } from "../../features/events/screens/OrganizerApplicationScreen";
import { OrganizerEventSubmissionScreen } from "../../features/events/screens/OrganizerEventSubmissionScreen";
import { VerificationGuidedCaptureScreen } from "../../features/events/screens/VerificationGuidedCaptureScreen";
import { AccountManagementScreen } from "../../features/profile/screens/AccountManagementScreen";
import { BlockedUsersScreen } from "../../features/profile/screens/BlockedUsersScreen";
import { ChangePasswordScreen } from "../../features/profile/screens/ChangePasswordScreen";
import { DeleteAccountScreen } from "../../features/profile/screens/DeleteAccountScreen";
import { FollowConnectionsScreen } from "../../features/profile/screens/FollowConnectionsScreen";
import { ProfileScreen } from "../../features/profile/screens/ProfileScreen";
import { ReportProblemScreen } from "../../features/profile/screens/ReportProblemScreen";
import { SettingsScreen } from "../../features/profile/screens/SettingsScreen";
import { TokenWalletScreen } from "../../features/token/screens/TokenWalletScreen";
import { TokenPackagesScreen } from "../../features/token/screens/TokenPackagesScreen";
import { FinanceScreen } from "../../features/token/screens/FinanceScreen";
import type { ProfileStackParamList } from "../types";
import { createEventScreenOptions } from "../createEventScreenOptions";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={ProfileScreen} name={ProfileRoutes.ProfileScreen} />
      <Stack.Screen component={SettingsScreen} name={ProfileRoutes.SettingsScreen} />
      <Stack.Screen component={TokenWalletScreen} name={ProfileRoutes.TokenWalletScreen} />
      <Stack.Screen component={TokenPackagesScreen} name={ProfileRoutes.TokenPackagesScreen} />
      <Stack.Screen component={FinanceScreen} name={ProfileRoutes.FinanceScreen} />
      <Stack.Screen component={AccountManagementScreen} name={ProfileRoutes.AccountManagementScreen} />
      <Stack.Screen component={ChangePasswordScreen} name={ProfileRoutes.ChangePasswordScreen} />
      <Stack.Screen component={DeleteAccountScreen} name={ProfileRoutes.DeleteAccountScreen} />
      <Stack.Screen component={BlockedUsersScreen} name={ProfileRoutes.BlockedUsersScreen} />
      <Stack.Screen component={FollowConnectionsScreen} name={ProfileRoutes.FollowConnectionsScreen} />
      <Stack.Screen component={ReportProblemScreen} name={ProfileRoutes.ReportProblemScreen} />
      <Stack.Screen
        component={CreateEventScreen}
        name={ProfileRoutes.CreateEventScreen}
        options={createEventScreenOptions}
      />
      <Stack.Screen component={MyOrganizerEventsScreen} name={ProfileRoutes.MyOrganizerEventsScreen} />
      <Stack.Screen component={AttendedEventsScreen} name={ProfileRoutes.AttendedEventsScreen} />
      <Stack.Screen
        component={OrganizerEventSubmissionScreen}
        name={ProfileRoutes.OrganizerEventSubmissionScreen}
      />
      <Stack.Screen component={OrganizerApplicationScreen} name={ProfileRoutes.OrganizerApplicationScreen} />
      <Stack.Screen
        component={VerificationGuidedCaptureScreen}
        name={ProfileRoutes.VerificationGuidedCaptureScreen}
        options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen component={EventDetailScreen} name={ProfileRoutes.EventDetailScreen} />
      <Stack.Screen component={EventAttendanceQrScreen} name={ProfileRoutes.EventAttendanceQrScreen} />
      <Stack.Screen
        component={EventQrScannerScreen}
        name={ProfileRoutes.EventQrScannerScreen}
        options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen component={EventAlbumScreen} name={ProfileRoutes.EventAlbumScreen} />
      <Stack.Screen component={CreateMomentScreen} name={ProfileRoutes.CreateMomentScreen} />
      <Stack.Screen component={CreateReelScreen} name={ProfileRoutes.CreateReelScreen} />
    </Stack.Navigator>
  );
}
