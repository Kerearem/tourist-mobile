import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { MessagesRoutes } from "../../constants/routes";
import { MessageThreadScreen } from "../../features/messages/screens/MessageThreadScreen";
import { MessagesInboxScreen } from "../../features/messages/screens/MessagesInboxScreen";
import type { MessagesStackParamList } from "../types";

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export function MessagesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen component={MessagesInboxScreen} name={MessagesRoutes.MessagesInboxScreen} />
      <Stack.Screen component={MessageThreadScreen} name={MessagesRoutes.MessageThreadScreen} />
    </Stack.Navigator>
  );
}
