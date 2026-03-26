import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { HelpRoutes } from "../../constants/routes";
import { CreateHelpRequestScreen } from "../../features/help/screens/CreateHelpRequestScreen";
import { HelpDetailScreen } from "../../features/help/screens/HelpDetailScreen";
import { HelpListScreen } from "../../features/help/screens/HelpListScreen";
import type { HelpStackParamList } from "../types";

const Stack = createNativeStackNavigator<HelpStackParamList>();

export function HelpStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen component={HelpListScreen} name={HelpRoutes.HelpListScreen} />
      <Stack.Screen component={CreateHelpRequestScreen} name={HelpRoutes.CreateHelpRequestScreen} />
      <Stack.Screen component={HelpDetailScreen} name={HelpRoutes.HelpDetailScreen} />
    </Stack.Navigator>
  );
}
