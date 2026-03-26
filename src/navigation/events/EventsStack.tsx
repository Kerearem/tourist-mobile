import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { EventsRoutes } from "../../constants/routes";
import { CreateEventScreen } from "../../features/events/screens/CreateEventScreen";
import { EventDetailScreen } from "../../features/events/screens/EventDetailScreen";
import { EventsListScreen } from "../../features/events/screens/EventsListScreen";
import { OrganizerApplicationScreen } from "../../features/events/screens/OrganizerApplicationScreen";
import type { EventsStackParamList } from "../types";

const Stack = createNativeStackNavigator<EventsStackParamList>();

export function EventsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen component={EventsListScreen} name={EventsRoutes.EventsListScreen} />
      <Stack.Screen component={EventDetailScreen} name={EventsRoutes.EventDetailScreen} />
      <Stack.Screen component={CreateEventScreen} name={EventsRoutes.CreateEventScreen} />
      <Stack.Screen component={OrganizerApplicationScreen} name={EventsRoutes.OrganizerApplicationScreen} />
    </Stack.Navigator>
  );
}
