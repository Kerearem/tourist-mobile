import type { MomentCommentItem, MomentLikeResult } from "../types/momentEngagement";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { ApiRequestError, apiRequest } from "../../../services/api/client";

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }
  return state.tokens.accessToken;
};

const withMomentPath = (template: string, eventId: string, momentId: string) =>
  template.replace(":eventId", eventId).replace(":momentId", momentId);

export async function likeMoment(eventId: string, momentId: string): Promise<MomentLikeResult> {
  const token = await getAccessToken();
  return apiRequest<MomentLikeResult>(withMomentPath(API_ENDPOINTS.events.momentLike, eventId, momentId), {
    method: "POST",
    token,
  });
}

export async function unlikeMoment(eventId: string, momentId: string): Promise<MomentLikeResult> {
  const token = await getAccessToken();
  return apiRequest<MomentLikeResult>(withMomentPath(API_ENDPOINTS.events.momentLike, eventId, momentId), {
    method: "DELETE",
    token,
  });
}

export async function getMomentComments(eventId: string, momentId: string): Promise<MomentCommentItem[]> {
  const token = await getAccessToken();
  return apiRequest<MomentCommentItem[]>(
    withMomentPath(API_ENDPOINTS.events.momentComments, eventId, momentId),
    {
      method: "GET",
      token,
    },
  );
}

export async function addMomentComment(
  eventId: string,
  momentId: string,
  text: string,
): Promise<MomentCommentItem[]> {
  const token = await getAccessToken();
  return apiRequest<MomentCommentItem[]>(
    withMomentPath(API_ENDPOINTS.events.momentComments, eventId, momentId),
    {
      method: "POST",
      token,
      body: { text },
    },
  );
}

export async function toggleMomentLike(
  eventId: string,
  momentId: string,
  currentlyLiked: boolean,
): Promise<MomentLikeResult> {
  try {
    return currentlyLiked
      ? await unlikeMoment(eventId, momentId)
      : await likeMoment(eventId, momentId);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 409) {
      return likeMoment(eventId, momentId);
    }
    throw error;
  }
}
