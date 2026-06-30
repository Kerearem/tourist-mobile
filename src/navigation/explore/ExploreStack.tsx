import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { ExploreRoutes } from "../../constants/routes";
import { ExploreCameraScreen } from "../../features/explore/screens/ExploreCameraScreen";
import { ExploreFeedScreen } from "../../features/explore/screens/ExploreFeedScreen";
import { CreateReelScreen } from "../../features/profile/screens/CreateReelScreen";
import { PublishSnapScreen } from "../../features/snaps/screens/PublishSnapScreen";
import type { ExploreStackParamList } from "../types";

const Stack = createNativeStackNavigator<ExploreStackParamList>();

export function ExploreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={ExploreFeedScreen} name={ExploreRoutes.ExploreFeedScreen} />
      <Stack.Screen component={ExploreCameraScreen} name={ExploreRoutes.ExploreCameraScreen} />
      <Stack.Screen component={PublishSnapScreen} name={ExploreRoutes.PublishSnapScreen} />
      <Stack.Screen component={CreateReelScreen} name={ExploreRoutes.CreateReelScreen} />
    </Stack.Navigator>
  );
}
