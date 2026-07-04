import { USE_MOCK_BACKEND } from "../../../constants/env";
import { hydrateAuthState } from "../../auth/services/auth.service";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

export type ComplaintReason =
  | "spam"
  | "harassment"
  | "inappropriate_content"
  | "fake_account"
  | "other";

export type ComplaintContentTargetType = "SNAP" | "MOMENT" | "REEL";

export type CreateUserComplaintInput = {
  targetUserId: string;
  reason: ComplaintReason;
  description?: string;
};

export type CreateContentComplaintInput = {
  targetType: ComplaintContentTargetType;
  targetId: string;
  reason: ComplaintReason;
  description?: string;
};

const REASON_LABELS: Record<ComplaintReason, string> = {
  spam: "Spam",
  harassment: "Taciz",
  inappropriate_content: "Uygunsuz içerik",
  fake_account: "Sahte hesap",
  other: "Diğer",
};

export const COMPLAINT_REASON_OPTIONS: Array<{ value: ComplaintReason; label: string }> = [
  { value: "spam", label: REASON_LABELS.spam },
  { value: "harassment", label: REASON_LABELS.harassment },
  { value: "inappropriate_content", label: REASON_LABELS.inappropriate_content },
  { value: "fake_account", label: REASON_LABELS.fake_account },
  { value: "other", label: REASON_LABELS.other },
];

const getAccessToken = async () => {
  if (USE_MOCK_BACKEND) {
    const state = await loadAuthState();
    if (!state?.tokens.accessToken) {
      throw new Error("Oturum bulunamadı.");
    }
    return state.tokens.accessToken;
  }

  const hydrated = await hydrateAuthState();
  if (!hydrated) {
    throw new Error("Oturum süresi doldu. Lütfen çıkış yapıp tekrar giriş yap.");
  }

  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Oturum bulunamadı.");
  }
  return state.tokens.accessToken;
};

const buildComplaintBody = (reason: ComplaintReason, description?: string) => ({
  reason: REASON_LABELS[reason],
  ...(description?.trim() ? { description: description.trim() } : {}),
});

export async function createUserComplaint(input: CreateUserComplaintInput): Promise<void> {
  if (USE_MOCK_BACKEND) {
    return;
  }

  const token = await getAccessToken();
  await apiRequest<{ success: boolean }>(API_ENDPOINTS.complaints.create, {
    method: "POST",
    token,
    body: {
      targetType: "USER",
      targetUserId: input.targetUserId,
      ...buildComplaintBody(input.reason, input.description),
    },
  });
}

export async function createContentComplaint(input: CreateContentComplaintInput): Promise<void> {
  if (USE_MOCK_BACKEND) {
    return;
  }

  const token = await getAccessToken();
  const body = {
    targetType: input.targetType,
    ...buildComplaintBody(input.reason, input.description),
    ...(input.targetType === "SNAP" ? { targetSnapId: input.targetId } : {}),
    ...(input.targetType === "MOMENT" ? { targetMomentId: input.targetId } : {}),
    ...(input.targetType === "REEL" ? { targetReelId: input.targetId } : {}),
  };

  await apiRequest<{ success: boolean }>(API_ENDPOINTS.complaints.create, {
    method: "POST",
    token,
    body,
  });
}
