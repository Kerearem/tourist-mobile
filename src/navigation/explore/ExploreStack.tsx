import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ExploreRoutes } from "../../constants/routes";
import { ExploreFeedScreen } from "../../features/explore/screens/ExploreFeedScreen";
import type { ExploreStackParamList } from "../types";

const Stack = createNativeStackNavigator<ExploreStackParamList>();

export function ExploreStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen component={ExploreFeedScreen} name={ExploreRoutes.ExploreFeedScreen} />
    </Stack.Navigator>
  );
}
