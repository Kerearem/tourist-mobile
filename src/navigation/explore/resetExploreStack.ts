import { CommonActions, type NavigationProp } from "@react-navigation/native";

import { ExploreRoutes } from "../../constants/routes";
import type { ExploreStackParamList } from "../types";

export function resetExploreToFeed(navigation: NavigationProp<ExploreStackParamList>) {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: ExploreRoutes.ExploreFeedScreen }],
    }),
  );
}
