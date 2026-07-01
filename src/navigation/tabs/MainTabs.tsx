import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { getFocusedRouteNameFromRoute, StackActions, type PartialState } from "@react-navigation/native";
import type { NavigationState, RouteProp } from "@react-navigation/native";

import { ExploreRoutes, TabRoutes } from "../../constants/routes";
import { theme } from "../../constants/theme";
import { EventsStack } from "../events/EventsStack";
import { ExploreStack } from "../explore/ExploreStack";
import { HelpStack } from "../help/HelpStack";
import { MessagesStack } from "../messages/MessagesStack";
import { ProfileStack } from "../profile/ProfileStack";
import type { MainTabParamList } from "../types";

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabRouteWithNestedState = RouteProp<MainTabParamList, keyof MainTabParamList> & {
  state?: PartialState<NavigationState>;
};

const getNestedTabState = (route: RouteProp<MainTabParamList, keyof MainTabParamList>) =>
  (route as TabRouteWithNestedState).state;

type TabIconName = keyof typeof Ionicons.glyphMap;

const tabIcons: Record<keyof MainTabParamList, { active: TabIconName; inactive: TabIconName }> = {
  ExploreTab: { active: "home", inactive: "home-outline" },
  HelpTab: { active: "heart", inactive: "heart-outline" },
  MessagesTab: { active: "chatbubble", inactive: "chatbubble-outline" },
  EventsTab: { active: "calendar", inactive: "calendar-outline" },
  ProfileTab: { active: "person", inactive: "person-outline" },
};

const baseTabBarStyle = {
  backgroundColor: theme.colors.surfaceElevated,
  borderTopColor: theme.colors.border,
  height: 74,
  paddingBottom: 10,
  paddingTop: 8,
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#5B3CF6",
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarIcon: ({ color, focused, size }) => {
          const icon = tabIcons[route.name];
          return <Ionicons color={color} name={focused ? icon.active : icon.inactive} size={size} />;
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarStyle: baseTabBarStyle,
      })}
    >
      <Tab.Screen
        component={ExploreStack}
        name={TabRoutes.ExploreTab}
        options={({ route }) => ({
          title: "Explore",
          tabBarStyle: getFocusedRouteNameFromRoute(route) === ExploreRoutes.ExploreCameraScreen ||
            getFocusedRouteNameFromRoute(route) === ExploreRoutes.PublishSnapScreen
            ? { display: "none" }
            : baseTabBarStyle,
        })}
        listeners={({ navigation, route }) => ({
          tabPress: (event) => {
            const nestedState = getNestedTabState(route);
            if (!nestedState || nestedState.index === 0) {
              return;
            }
            event.preventDefault();
            navigation.dispatch({
              ...StackActions.popToTop(),
              target: nestedState.key,
            });
          },
        })}
      />
      <Tab.Screen component={HelpStack} name={TabRoutes.HelpTab} options={{ title: "Help" }} />
      <Tab.Screen
        component={MessagesStack}
        name={TabRoutes.MessagesTab}
        options={{ title: "Messages" }}
        listeners={({ navigation, route }) => ({
          tabPress: (event) => {
            if (!navigation.isFocused()) {
              return;
            }
            const nestedState = getNestedTabState(route);
            if (!nestedState || nestedState.index === 0) {
              return;
            }
            event.preventDefault();
            navigation.dispatch({
              ...StackActions.popToTop(),
              target: nestedState.key,
            });
          },
        })}
      />
      <Tab.Screen
        component={EventsStack}
        name={TabRoutes.EventsTab}
        options={{ title: "Events" }}
        listeners={({ navigation, route }) => ({
          tabPress: (event) => {
            const nestedState = getNestedTabState(route);
            if (!nestedState || nestedState.index === 0) {
              return;
            }
            event.preventDefault();
            navigation.dispatch({
              ...StackActions.popToTop(),
              target: nestedState.key,
            });
          },
        })}
      />
      <Tab.Screen component={ProfileStack} name={TabRoutes.ProfileTab} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}
