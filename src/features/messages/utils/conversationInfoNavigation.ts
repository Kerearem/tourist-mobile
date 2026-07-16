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

/** Group member rows: open public profile for others; own row is a no-op. */
export function canOpenGroupMemberProfile(memberId: string, viewerId: string): boolean {
  return Boolean(memberId && viewerId && memberId !== viewerId);
}

export function buildGroupMemberProfileParams(member: {
  id: string;
  displayName: string;
  avatarUrl?: string;
  role?: "MEMBER" | "ORGANIZER";
}): MessageUserProfileScreenParams {
  return {
    userId: member.id,
    displayName: member.displayName,
    avatarUrl: member.avatarUrl,
    isOrganizer: member.role === "ORGANIZER",
  };
}
