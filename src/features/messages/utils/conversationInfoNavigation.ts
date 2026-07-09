import { MessagesRoutes } from "../../../constants/routes";
import type { MessageUserProfileScreenParams } from "../../../navigation/types";
import type { ConversationParticipantProfile } from "../types";

export function resolveConversationInfoNavigation(threadId: string) {
  return {
    screen: MessagesRoutes.ConversationInfoScreen,
    params: { threadId },
  } as const;
}

export function canOpenConversationInfo(): boolean {
  return true;
}

export function buildMessageUserProfileParams(
  participant: ConversationParticipantProfile,
  sourceThreadId?: string,
): MessageUserProfileScreenParams {
  return {
    userId: participant.id,
    displayName: participant.displayName,
    username: participant.username,
    avatarUrl: participant.avatarUrl,
    isOrganizer: participant.isOrganizer,
    sourceThreadId,
  };
}

export function resolveMessageUserProfileNavigation(params: MessageUserProfileScreenParams) {
  return {
    screen: MessagesRoutes.MessageUserProfileScreen,
    params,
  } as const;
}

export function canOpenMessageUserProfile(
  otherParticipant?: ConversationParticipantProfile | null,
  isSystemInbox = false,
): boolean {
  return Boolean(otherParticipant && !isSystemInbox);
}
