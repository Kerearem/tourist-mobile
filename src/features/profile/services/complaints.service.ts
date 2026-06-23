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

export type CreateUserComplaintInput = {
  targetUserId: string;
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

export async function createUserComplaint(input: CreateUserComplaintInput): Promise<void> {
  const reasonLabel = REASON_LABELS[input.reason];

  if (USE_MOCK_BACKEND) {
    void reasonLabel;
    return;
  }

  const token = await getAccessToken();
  await apiRequest<{ success: boolean }>(API_ENDPOINTS.complaints.create, {
    method: "POST",
    token,
    body: {
      targetUserId: input.targetUserId,
      reason: reasonLabel,
      ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    },
  });
}
