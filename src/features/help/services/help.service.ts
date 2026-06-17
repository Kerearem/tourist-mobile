import type { CreateHelpRequestInput, GetHelpRequestsInput, HelpRequest, RespondToHelpRequestInput } from "../types";
import { USE_MOCK_BACKEND } from "../../../constants/env";
import { API_ENDPOINTS } from "../../../services/api/endpoints";
import { loadAuthState } from "../../../services/api/authSession";
import { apiRequest } from "../../../services/api/client";

const getAccessToken = async () => {
  const state = await loadAuthState();
  if (!state?.tokens.accessToken) {
    throw new Error("Missing access token.");
  }
  return state.tokens.accessToken;
};

const withRequestId = (template: string, requestId: string) => template.replace(":requestId", requestId);
const mockHelpRequests: HelpRequest[] = [
  {
    id: "help_demo_home",
    author: { id: "user_demo_1", displayName: "Merve Y." },
    community: "Turkish",
    countryCode: "DE",
    city: "Kreuzberg",
    createdAt: "2026-05-01T18:10:00.000Z",
    title: "Need help moving a sofa",
    description: "I just bought a sofa from IKEA but it does not fit in my car. Can anyone with a van help me?",
    category: "Home",
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
    title: "Student Visa extension question",
    description: "Has anyone recently renewed their student visa? I have a specific question about the finance proof.",
    category: "Visa",
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
    title: "English speaking dentist?",
    description: "Looking for recommendations for a good English speaking dentist in Mitte area. Just for a checkup.",
    category: "Health",
    status: "open",
    responsesCount: 0,
    viewerState: { hasResponded: false },
  },
];

export async function getHelpRequests({ viewerId, community, countryCode, city }: GetHelpRequestsInput): Promise<HelpRequest[]> {
  if (USE_MOCK_BACKEND) {
    void viewerId;
    return mockHelpRequests.filter((request) => {
      const matchesCommunity = !community || request.community.toLowerCase() === community.toLowerCase();
      const matchesCountry = !countryCode || request.countryCode.toLowerCase() === countryCode.toLowerCase();
      const matchesCity = !city || request.city.toLowerCase() === city.toLowerCase();
      return matchesCommunity && matchesCountry && matchesCity;
    });
  }

  void viewerId;
  const token = await getAccessToken();
  const params = new URLSearchParams();
  if (community) {
    params.set("community", community);
  }
  if (countryCode) {
    params.set("countryCode", countryCode);
  }
  if (city) {
    params.set("city", city);
  }
  const query = params.toString();

  return apiRequest<HelpRequest[]>(`${API_ENDPOINTS.help.list}${query ? `?${query}` : ""}`, {
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
  const token = await getAccessToken();
  return apiRequest<HelpRequest>(API_ENDPOINTS.help.create, {
    method: "POST",
    token,
    body: {
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category?.trim() || undefined,
      community: input.community,
      countryCode: input.countryCode,
      city: input.city,
    },
  });
}

export async function respondToHelpRequest({ requestId, viewerId }: RespondToHelpRequestInput): Promise<HelpRequest | null> {
  void viewerId;
  const token = await getAccessToken();
  return apiRequest<HelpRequest | null>(withRequestId(API_ENDPOINTS.help.respond, requestId), {
    method: "POST",
    token,
  });
}
