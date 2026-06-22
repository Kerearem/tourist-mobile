import { USE_MOCK_BACKEND } from "../../../constants/env";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

export type EventGroupMember = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  role: "MEMBER" | "ORGANIZER";
};

export type EventGroupInfo = {
  conversationId: string;
  eventId: string;
  title: string;
  memberCount: number;
  isMember: boolean;
  isArchived: boolean;
  viewerRole?: "MEMBER" | "ORGANIZER";
  members: EventGroupMember[];
};

const withEventId = (template: string, eventId: string) => template.replace(":eventId", eventId);
const withUserId = (template: string, userId: string) => template.replace(":userId", userId);

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }
  return state.tokens.accessToken;
};

export async function getEventGroup(eventId: string): Promise<EventGroupInfo | null> {
  if (USE_MOCK_BACKEND) {
    return null;
  }

  const token = await getAccessToken();
  return apiRequest<EventGroupInfo | null>(withEventId(API_ENDPOINTS.events.group, eventId), {
    method: "GET",
    token,
  });
}

export async function createEventGroup(eventId: string): Promise<EventGroupInfo> {
  if (USE_MOCK_BACKEND) {
    throw new Error("Event groups require backend.");
  }

  const token = await getAccessToken();
  const result = await apiRequest<EventGroupInfo | null>(withEventId(API_ENDPOINTS.events.group, eventId), {
    method: "POST",
    token,
  });
  if (!result) {
    throw new Error("Group could not be created.");
  }
  return result;
}

export async function removeEventGroupMember(eventId: string, userId: string): Promise<EventGroupInfo | null> {
  if (USE_MOCK_BACKEND) {
    return null;
  }

  const token = await getAccessToken();
  return apiRequest<EventGroupInfo | null>(
    withUserId(withEventId(API_ENDPOINTS.events.removeGroupMember, eventId), userId),
    {
      method: "DELETE",
      token,
    },
  );
}
