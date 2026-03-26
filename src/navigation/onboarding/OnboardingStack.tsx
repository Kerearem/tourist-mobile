import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { OnboardingRoutes } from "../../constants/routes";
import { CityScreen } from "../../features/onboarding/screens/CityScreen";
import { CommunityScreen } from "../../features/onboarding/screens/CommunityScreen";
import { CountryScreen } from "../../features/onboarding/screens/CountryScreen";
import { LocationPermissionScreen } from "../../features/onboarding/screens/LocationPermissionScreen";
import type { OnboardingStackParamList } from "../types";

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={CommunityScreen} name={OnboardingRoutes.CommunityScreen} />
      <Stack.Screen component={CountryScreen} name={OnboardingRoutes.CountryScreen} />
      <Stack.Screen component={CityScreen} name={OnboardingRoutes.CityScreen} />
      <Stack.Screen component={LocationPermissionScreen} name={OnboardingRoutes.LocationPermissionScreen} />
    </Stack.Navigator>
  );
}
