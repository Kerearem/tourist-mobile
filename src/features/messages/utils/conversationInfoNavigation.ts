import { MessagesRoutes } from "../../../constants/routes";

export function resolveConversationInfoNavigation(threadId: string) {
  return {
    screen: MessagesRoutes.ConversationInfoScreen,
    params: { threadId },
  } as const;
}

export function canOpenConversationInfo(): boolean {
  return true;
}
