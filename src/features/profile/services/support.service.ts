import { USE_MOCK_BACKEND } from "../../../constants/env";
import { hydrateAuthState } from "../../auth/services/auth.service";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

import {
  SUPPORT_TOPIC_LABELS,
  SUPPORT_TOPIC_OPTIONS,
  type SupportTopic,
} from "../constants/supportTopics";

export { SUPPORT_TOPIC_OPTIONS, type SupportTopic };

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
      topic: SUPPORT_TOPIC_LABELS[input.topic],
      message,
    },
  });
}
