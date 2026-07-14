import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { ApiRequestError, apiRequest } from "../../../services/api/client";
import type { ProfileContentType } from "../utils/profileContentManagement";

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Oturum bulunamadı.");
  }
  return state.tokens.accessToken;
};

const withSnapId = (template: string, snapId: string) => template.replace(":snapId", snapId);
const withReelId = (template: string, reelId: string) => template.replace(":reelId", reelId);
const withEventId = (template: string, eventId: string) => template.replace(":eventId", eventId);
const withMomentId = (path: string, momentId: string) => path.replace(":momentId", momentId);

const formatManagementError = (error: unknown, fallback: string) => {
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
};

export type ProfileContentPinResult = {
  targetType: ProfileContentType;
  targetId: string;
  pinnedAt: string;
};

export async function pinProfileContent(
  targetType: ProfileContentType,
  targetId: string,
): Promise<ProfileContentPinResult> {
  const token = await getAccessToken();

  try {
    return await apiRequest<ProfileContentPinResult>(API_ENDPOINTS.profile.contentPins, {
      method: "POST",
      token,
      body: {
        targetType,
        targetId,
      },
    });
  } catch (error) {
    throw new Error(formatManagementError(error, "Gönderi sabitlenemedi."));
  }
}

export async function unpinProfileContent(
  targetType: ProfileContentType,
  targetId: string,
): Promise<void> {
  const token = await getAccessToken();

  try {
    await apiRequest<{ success: true }>(
      API_ENDPOINTS.profile.contentPin
        .replace(":targetType", targetType)
        .replace(":targetId", targetId),
      {
        method: "DELETE",
        token,
      },
    );
  } catch (error) {
    throw new Error(formatManagementError(error, "Sabitleme kaldırılamadı."));
  }
}

export async function updateSnapCaption(snapId: string, caption: string): Promise<{ caption: string | null }> {
  const token = await getAccessToken();

  try {
    const result = await apiRequest<{ caption?: string | null }>(
      withSnapId(API_ENDPOINTS.snaps.updateCaption, snapId),
      {
        method: "PATCH",
        token,
        body: { caption },
      },
    );
    return { caption: result.caption ?? null };
  } catch (error) {
    throw new Error(formatManagementError(error, "Snap düzenlenemedi."));
  }
}

export async function updateReelCaption(reelId: string, caption: string): Promise<{ caption: string | null }> {
  const token = await getAccessToken();

  try {
    const result = await apiRequest<{ caption: string | null }>(
      withReelId(API_ENDPOINTS.organizer.updateReelCaption, reelId),
      {
        method: "PATCH",
        token,
        body: { caption },
      },
    );
    return { caption: result.caption ?? null };
  } catch (error) {
    throw new Error(formatManagementError(error, "Tanıtım düzenlenemedi."));
  }
}

export async function updateMomentCaption(
  eventId: string,
  momentId: string,
  caption: string,
): Promise<{ caption: string | null }> {
  const token = await getAccessToken();

  try {
    const result = await apiRequest<{ caption: string | null }>(
      withMomentId(withEventId(API_ENDPOINTS.events.momentDetail, eventId), momentId),
      {
        method: "PATCH",
        token,
        body: { caption },
      },
    );
    return { caption: result.caption ?? null };
  } catch (error) {
    throw new Error(formatManagementError(error, "Moment düzenlenemedi."));
  }
}

export async function deleteEventMoment(eventId: string, momentId: string): Promise<void> {
  const token = await getAccessToken();

  try {
    await apiRequest<{ success: true }>(
      withMomentId(withEventId(API_ENDPOINTS.events.momentDetail, eventId), momentId),
      {
        method: "DELETE",
        token,
      },
    );
  } catch (error) {
    throw new Error(formatManagementError(error, "Moment silinemedi."));
  }
}
