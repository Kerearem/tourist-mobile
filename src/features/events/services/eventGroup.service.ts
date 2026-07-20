import { USE_MOCK_BACKEND } from "../../../constants/env";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

export type EventGroupMember = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  role: "MEMBER" | "ORGANIZER";
  hasBlockRelation?: boolean;
  iFollow?: boolean;
  isFriend?: boolean;
  mutedUntil?: string | null;
};

export type EventGroupInfo = {
  conversationId: string;
  eventId: string;
  title: string;
  memberCount: number;
  isMember: boolean;
  isArchived: boolean;
  isClosed?: boolean;
  closedAt?: string | null;
  viewerMutedUntil?: string | null;
  viewerRole?: "MEMBER" | "ORGANIZER";
  members: EventGroupMember[];
};

export type MuteDurationMinutes = 15 | 60 | 480 | 1440;

const withEventId = (template: string, eventId: string) => template.replace(":eventId", eventId);
const withUserId = (template: string, userId: string) => template.replace(":userId", userId);

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }
  return state.tokens.accessToken;
};

const requireGroup = async (result: EventGroupInfo | null, fallback: string) => {
  if (!result) {
    throw new Error(fallback);
  }
  return result;
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
  return requireGroup(result, "Group could not be created.");
}

export async function archiveEventGroup(eventId: string): Promise<EventGroupInfo> {
  if (USE_MOCK_BACKEND) {
    throw new Error("Event groups require backend.");
  }

  const token = await getAccessToken();
  const result = await apiRequest<EventGroupInfo | null>(
    withEventId(API_ENDPOINTS.events.archiveGroup, eventId),
    {
      method: "POST",
      token,
    },
  );
  return requireGroup(result, "Group could not be archived.");
}

export async function closeEventGroup(eventId: string): Promise<EventGroupInfo> {
  if (USE_MOCK_BACKEND) {
    throw new Error("Event groups require backend.");
  }

  const token = await getAccessToken();
  const result = await apiRequest<EventGroupInfo | null>(
    withEventId(API_ENDPOINTS.events.closeGroup, eventId),
    {
      method: "POST",
      token,
    },
  );
  return requireGroup(result, "Group could not be closed.");
}

export async function kickEventGroupMember(
  eventId: string,
  userId: string,
  reason: string,
): Promise<EventGroupInfo> {
  if (USE_MOCK_BACKEND) {
    throw new Error("Event groups require backend.");
  }

  const token = await getAccessToken();
  const result = await apiRequest<EventGroupInfo | null>(
    withUserId(withEventId(API_ENDPOINTS.events.kickGroupMember, eventId), userId),
    {
      method: "POST",
      token,
      body: { reason },
    },
  );
  return requireGroup(result, "Member could not be removed.");
}

export async function banEventGroupMember(
  eventId: string,
  userId: string,
  reason: string,
): Promise<EventGroupInfo> {
  if (USE_MOCK_BACKEND) {
    throw new Error("Event groups require backend.");
  }

  const token = await getAccessToken();
  const result = await apiRequest<EventGroupInfo | null>(
    withUserId(withEventId(API_ENDPOINTS.events.banGroupMember, eventId), userId),
    {
      method: "POST",
      token,
      body: { reason },
    },
  );
  return requireGroup(result, "Member could not be banned.");
}

export async function muteEventGroupMember(
  eventId: string,
  userId: string,
  durationMinutes: MuteDurationMinutes,
  reason?: string,
): Promise<EventGroupInfo> {
  if (USE_MOCK_BACKEND) {
    throw new Error("Event groups require backend.");
  }

  const token = await getAccessToken();
  const result = await apiRequest<EventGroupInfo | null>(
    withUserId(withEventId(API_ENDPOINTS.events.muteGroupMember, eventId), userId),
    {
      method: "POST",
      token,
      body: {
        durationMinutes,
        ...(reason?.trim() ? { reason: reason.trim() } : {}),
      },
    },
  );
  return requireGroup(result, "Member could not be muted.");
}

export async function unmuteEventGroupMember(eventId: string, userId: string): Promise<EventGroupInfo> {
  if (USE_MOCK_BACKEND) {
    throw new Error("Event groups require backend.");
  }

  const token = await getAccessToken();
  const result = await apiRequest<EventGroupInfo | null>(
    withUserId(withEventId(API_ENDPOINTS.events.muteGroupMember, eventId), userId),
    {
      method: "DELETE",
      token,
    },
  );
  return requireGroup(result, "Mute could not be cleared.");
}

/** @deprecated Prefer kickEventGroupMember with a reason. */
export async function removeEventGroupMember(eventId: string, userId: string): Promise<EventGroupInfo | null> {
  return kickEventGroupMember(eventId, userId, "Organizator cikardi");
}
