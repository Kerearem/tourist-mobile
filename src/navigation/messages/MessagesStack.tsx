import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { MessagesRoutes } from "../../constants/routes";
import { MessageThreadScreen } from "../../features/messages/screens/MessageThreadScreen";
import { GroupDetailScreen } from "../../features/messages/screens/GroupDetailScreen";
import { GroupInfoScreen } from "../../features/messages/screens/GroupInfoScreen";
import { MessageRequestsScreen } from "../../features/messages/screens/MessageRequestsScreen";
import { MessagesInboxScreen } from "../../features/messages/screens/MessagesInboxScreen";
import { NotificationsScreen } from "../../features/messages/screens/NotificationsScreen";
import type { MessagesStackParamList } from "../types";

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export function MessagesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={MessagesInboxScreen} name={MessagesRoutes.MessagesInboxScreen} />
      <Stack.Screen component={NotificationsScreen} name={MessagesRoutes.NotificationsScreen} />
      <Stack.Screen component={MessageRequestsScreen} name={MessagesRoutes.MessageRequestsScreen} />
      <Stack.Screen component={MessageThreadScreen} name={MessagesRoutes.MessageThreadScreen} />
      <Stack.Screen component={GroupDetailScreen} name={MessagesRoutes.GroupDetailScreen} />
      <Stack.Screen component={GroupInfoScreen} name={MessagesRoutes.GroupInfoScreen} />
    </Stack.Navigator>
  );
}
