import { USE_MOCK_BACKEND } from "../../../constants/env";
import { hydrateAuthState } from "../../auth/services/auth.service";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

export type SupportTopic =
  | "login_access"
  | "messages"
  | "events"
  | "help_requests"
  | "other";

export const SUPPORT_TOPIC_OPTIONS: Array<{ value: SupportTopic; label: string }> = [
  { value: "login_access", label: "Giriş ve hesap erişimi" },
  { value: "messages", label: "Mesajlar" },
  { value: "events", label: "Etkinlik katılımı" },
  { value: "help_requests", label: "Yardım istekleri" },
  { value: "other", label: "Diğer" },
];

const TOPIC_LABELS: Record<SupportTopic, string> = {
  login_access: "Giriş ve hesap erişimi",
  messages: "Mesajlar",
  events: "Etkinlik katılımı",
  help_requests: "Yardım istekleri",
  other: "Diğer",
};

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

export async function submitSupportReport(input: {
  topic: SupportTopic;
  message: string;
}): Promise<void> {
  const message = input.message.trim();
  if (!message) {
    throw new Error("Açıklama boş olamaz.");
  }

  if (USE_MOCK_BACKEND) {
    return;
  }

  const token = await getAccessToken();
  await apiRequest<{ success: boolean }>(API_ENDPOINTS.support.report, {
    method: "POST",
    token,
    body: {
      topic: TOPIC_LABELS[input.topic],
      message,
    },
  });
}
