import type { ApplyOrganizerInput, OrganizerStatusResponse } from "../types/organizer";
import type { EventItem } from "../types";
import { USE_MOCK_BACKEND } from "../../../constants/env";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Oturum bulunamadı.");
  }
  return state.tokens.accessToken;
};

export async function getOrganizerStatus(): Promise<OrganizerStatusResponse> {
  if (USE_MOCK_BACKEND) {
    return {
      organizerStatus: "not_applied",
    };
  }

  const token = await getAccessToken();
  return apiRequest<OrganizerStatusResponse>(API_ENDPOINTS.organizer.status, {
    method: "GET",
    token,
  });
}

export async function applyForOrganizer(input: ApplyOrganizerInput): Promise<OrganizerStatusResponse> {
  if (USE_MOCK_BACKEND) {
    return {
      organizerStatus: "pending",
      application: {
        id: `app_${Date.now()}`,
        reason: input.reason,
        status: "pending",
        type: "individual",
        createdAt: new Date().toISOString(),
      },
    };
  }

  const token = await getAccessToken();
  return apiRequest<OrganizerStatusResponse>(API_ENDPOINTS.organizer.apply, {
    method: "POST",
    token,
    body: input,
  });
}

const withUserIdParam = (template: string, userId: string) => template.replace(":userId", userId);

export async function getMyOrganizerEvents(): Promise<EventItem[]> {
  if (USE_MOCK_BACKEND) {
    return [];
  }

  const token = await getAccessToken();
  return apiRequest<EventItem[]>(API_ENDPOINTS.organizer.myEvents, {
    method: "GET",
    token,
  });
}

export async function getOrganizerPublicEvents(userId: string): Promise<EventItem[]> {
  if (USE_MOCK_BACKEND) {
    return [];
  }

  const token = await getAccessToken();
  return apiRequest<EventItem[]>(withUserIdParam(API_ENDPOINTS.users.organizerEvents, userId), {
    method: "GET",
    token,
  });
}

export async function getMyAttendedEvents(): Promise<EventItem[]> {
  if (USE_MOCK_BACKEND) {
    return [];
  }

  const token = await getAccessToken();
  return apiRequest<EventItem[]>(API_ENDPOINTS.events.myAttendances, {
    method: "GET",
    token,
  });
}
