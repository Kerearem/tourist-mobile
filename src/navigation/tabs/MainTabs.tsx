import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { TabRoutes } from "../../constants/routes";
import { EventsStack } from "../events/EventsStack";
import { ExploreStack } from "../explore/ExploreStack";
import { HelpStack } from "../help/HelpStack";
import { MessagesStack } from "../messages/MessagesStack";
import { ProfileStack } from "../profile/ProfileStack";
import type { MainTabParamList } from "../types";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen component={ExploreStack} name={TabRoutes.ExploreTab} options={{ title: "Explore" }} />
      <Tab.Screen component={HelpStack} name={TabRoutes.HelpTab} options={{ title: "Help" }} />
      <Tab.Screen component={MessagesStack} name={TabRoutes.MessagesTab} options={{ title: "Messages" }} />
      <Tab.Screen component={EventsStack} name={TabRoutes.EventsTab} options={{ title: "Events" }} />
      <Tab.Screen component={ProfileStack} name={TabRoutes.ProfileTab} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}
