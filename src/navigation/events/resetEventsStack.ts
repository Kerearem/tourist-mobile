import { CommonActions } from "@react-navigation/native";

import { EventsRoutes } from "../../constants/routes";

export function createEventsFeedResetAction() {
  return CommonActions.reset({
    index: 0,
    routes: [{ name: EventsRoutes.EventsListScreen }],
  });
}
