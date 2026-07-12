import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { EventsRoutes } from "../../constants/routes";
import { CreateEventScreen } from "../../features/events/screens/CreateEventScreen";
import { CreateMomentScreen } from "../../features/events/screens/CreateMomentScreen";
import { EventAlbumScreen } from "../../features/events/screens/EventAlbumScreen";
import { EventDetailScreen } from "../../features/events/screens/EventDetailScreen";
import { EventsListScreen } from "../../features/events/screens/EventsListScreen";
import { MyOrganizerEventsScreen } from "../../features/events/screens/MyOrganizerEventsScreen";
import { OrganizerApplicationScreen } from "../../features/events/screens/OrganizerApplicationScreen";
import { OrganizerEventSubmissionScreen } from "../../features/events/screens/OrganizerEventSubmissionScreen";
import { VerificationGuidedCaptureScreen } from "../../features/events/screens/VerificationGuidedCaptureScreen";
import type { EventsStackParamList } from "../types";
import { createEventScreenOptions } from "../createEventScreenOptions";

const Stack = createNativeStackNavigator<EventsStackParamList>();

export function EventsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={EventsListScreen} name={EventsRoutes.EventsListScreen} />
      <Stack.Screen
        component={EventDetailScreen}
        name={EventsRoutes.EventDetailScreen}
        options={{
          fullScreenGestureEnabled: true,
          gestureEnabled: true,
        }}
      />
      <Stack.Screen component={EventAlbumScreen} name={EventsRoutes.EventAlbumScreen} />
      <Stack.Screen component={CreateMomentScreen} name={EventsRoutes.CreateMomentScreen} />
      <Stack.Screen
        component={CreateEventScreen}
        name={EventsRoutes.CreateEventScreen}
        options={createEventScreenOptions}
      />
      <Stack.Screen component={OrganizerApplicationScreen} name={EventsRoutes.OrganizerApplicationScreen} />
      <Stack.Screen
        component={VerificationGuidedCaptureScreen}
        name={EventsRoutes.VerificationGuidedCaptureScreen}
        options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen component={MyOrganizerEventsScreen} name={EventsRoutes.MyOrganizerEventsScreen} />
      <Stack.Screen
        component={OrganizerEventSubmissionScreen}
        name={EventsRoutes.OrganizerEventSubmissionScreen}
      />
    </Stack.Navigator>
  );
}
