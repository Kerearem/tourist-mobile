import type {
  CreateHelpRequestInput,
  GetHelpRequestsInput,
  HelpRequest,
  RespondToHelpRequestInput,
  RespondToHelpRequestResult,
  UpdateHelpRequestStatusInput,
} from "../types";
import { USE_MOCK_BACKEND } from "../../../constants/env";
import { hydrateAuthState } from "../../auth/services/auth.service";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

const formatHelpApiError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "İstek başarısız oldu.";
  const normalized = message.toLowerCase();
  if (normalized.includes("unauthorized") || normalized.includes("invalid session")) {
    return "Oturum süresi doldu. Lütfen çıkış yapıp tekrar giriş yap.";
  }
  return message;
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

const withRequestId = (template: string, requestId: string) => template.replace(":requestId", requestId);

const mapStatusToApi = (status: HelpRequest["status"]) => {
  if (status === "in_progress") {
    return "IN_PROGRESS";
  }
  if (status === "resolved") {
    return "RESOLVED";
  }
  return "OPEN";
};

const mockHelpRequests: HelpRequest[] = [
  {
    id: "help_demo_home",
    author: { id: "user_demo_1", displayName: "Merve Y." },
    community: "Turkish",
    countryCode: "DE",
    city: "Kreuzberg",
    createdAt: "2026-05-01T18:10:00.000Z",
    title: "Kanepe taşımada yardım",
    description: "IKEA'dan aldığım kanepe arabaya sığmıyor. Minibüsü olan var mı?",
    category: "DAILY_LIFE",
    status: "open",
    responsesCount: 0,
    viewerState: { hasResponded: false },
  },
  {
    id: "help_demo_visa",
    author: { id: "user_demo_2", displayName: "Ayse Y." },
    community: "Turkish",
    countryCode: "DE",
    city: "Berlin",
    createdAt: "2026-05-01T16:00:00.000Z",
    title: "Öğrenci vizesi uzatma sorusu",
    description: "Yakın zamanda öğrenci vizesini uzatan oldu mu? Finans kanıtı hakkında sorum var.",
    category: "VISA_LEGAL",
    status: "open",
    responsesCount: 0,
    viewerState: { hasResponded: false },
  },
  {
    id: "help_demo_health",
    author: { id: "user_demo_3", displayName: "Burak A." },
    community: "Turkish",
    countryCode: "DE",
    city: "Mitte",
    createdAt: "2026-05-01T14:00:00.000Z",
    title: "İngilizce konuşan diş hekimi?",
    description: "Mitte bölgesinde İngilizce konuşan diş hekimi önerisi arıyorum.",
    category: "HEALTH",
    status: "open",
    responsesCount: 0,
    viewerState: { hasResponded: false },
  },
];

export async function getHelpRequests({
  viewerId,
  locationScope = "city",
  identityScope = "everyone",
  category,
  search,
}: GetHelpRequestsInput): Promise<HelpRequest[]> {
  if (USE_MOCK_BACKEND) {
    void viewerId;
    const mockResidenceCountry = "DE";
    const mockResidenceCity = "Berlin";

    return mockHelpRequests.filter((request) => {
      const matchesCountry = request.countryCode.toUpperCase() === mockResidenceCountry;
      const matchesCity =
        locationScope === "country" ||
        request.city.toLowerCase() === mockResidenceCity.toLowerCase();
      const matchesIdentity =
        identityScope === "everyone" ||
        request.community.toLowerCase().includes("turkish");
      const matchesCategory = !category || request.category === category;
      const matchesSearch =
        !search ||
        request.title.toLowerCase().includes(search.toLowerCase()) ||
        request.description.toLowerCase().includes(search.toLowerCase());
      return matchesCountry && matchesCity && matchesIdentity && matchesCategory && matchesSearch;
    });
  }

  void viewerId;
  const token = await getAccessToken();
  const params = new URLSearchParams();
  params.set("locationScope", locationScope);
  params.set("identityScope", identityScope);
  if (category) {
    params.set("category", category);
  }
  if (search?.trim()) {
    params.set("search", search.trim());
  }

  return apiRequest<HelpRequest[]>(`${API_ENDPOINTS.help.list}?${params.toString()}`, {
    method: "GET",
    token,
  });
}

export async function getHelpRequestById(requestId: string, viewerId: string): Promise<HelpRequest | null> {
  if (USE_MOCK_BACKEND) {
    void viewerId;
    return mockHelpRequests.find((request) => request.id === requestId) ?? null;
  }

  void viewerId;
  const token = await getAccessToken();
  return apiRequest<HelpRequest | null>(withRequestId(API_ENDPOINTS.help.detail, requestId), {
    method: "GET",
    token,
  });
}

export async function createHelpRequest(input: CreateHelpRequestInput): Promise<HelpRequest> {
  if (USE_MOCK_BACKEND) {
    const created: HelpRequest = {
      id: `help_mock_${Date.now()}`,
      author: { id: "mock_user", displayName: "Mock User" },
      community: input.community,
      countryCode: input.countryCode,
      city: input.city,
      createdAt: new Date().toISOString(),
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
      status: "open",
      responsesCount: 0,
      viewerState: { hasResponded: false },
      ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
    };
    mockHelpRequests.unshift(created);
    return created;
  }

  try {
    const token = await getAccessToken();
    return await apiRequest<HelpRequest>(API_ENDPOINTS.help.create, {
      method: "POST",
      token,
      body: {
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        community: input.community,
        countryCode: input.countryCode,
        city: input.city,
        ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
      },
    });
  } catch (error) {
    throw new Error(formatHelpApiError(error));
  }
}

export async function respondToHelpRequest({
  requestId,
  viewerId,
}: RespondToHelpRequestInput): Promise<RespondToHelpRequestResult> {
  if (USE_MOCK_BACKEND) {
    void viewerId;
    const request = mockHelpRequests.find((item) => item.id === requestId);
    if (!request) {
      throw new Error("İstek bulunamadı.");
    }
    request.responsesCount += 1;
    request.viewerState.hasResponded = true;
    return {
      helpRequest: request,
      conversationId: `thread_help_${requestId}`,
    };
  }

  void viewerId;
  const token = await getAccessToken();
  return apiRequest<RespondToHelpRequestResult>(withRequestId(API_ENDPOINTS.help.respond, requestId), {
    method: "POST",
    token,
  });
}

export async function updateHelpRequestStatus({
  requestId,
  status,
}: UpdateHelpRequestStatusInput): Promise<HelpRequest> {
  if (USE_MOCK_BACKEND) {
    const request = mockHelpRequests.find((item) => item.id === requestId);
    if (!request) {
      throw new Error("İstek bulunamadı.");
    }
    request.status = status;
    return request;
  }

  const token = await getAccessToken();
  return apiRequest<HelpRequest>(withRequestId(API_ENDPOINTS.help.updateStatus, requestId), {
    method: "PATCH",
    token,
    body: { status: mapStatusToApi(status) },
  });
}

export async function deleteHelpRequest(requestId: string): Promise<void> {
  if (USE_MOCK_BACKEND) {
    const index = mockHelpRequests.findIndex((item) => item.id === requestId);
    if (index >= 0) {
      mockHelpRequests.splice(index, 1);
    }
    return;
  }

  const token = await getAccessToken();
  await apiRequest<{ success: boolean }>(withRequestId(API_ENDPOINTS.help.delete, requestId), {
    method: "DELETE",
    token,
  });
}
