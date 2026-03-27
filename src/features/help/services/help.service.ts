import type { CreateHelpRequestInput, GetHelpRequestsInput, HelpRequest, RespondToHelpRequestInput } from "../types";

type StoredHelpRequest = Omit<HelpRequest, "responsesCount" | "viewerState"> & {
  responderIds: string[];
};

const helpRequestsStore: StoredHelpRequest[] = [
  {
    id: "help_1",
    author: {
      id: "user_1001",
      displayName: "Ayse K.",
    },
    community: "Turkish",
    countryCode: "DE",
    city: "Berlin",
    createdAt: "2026-03-27T11:10:00.000Z",
    title: "Need advice for local health insurance",
    description: "I just moved to Berlin and need quick guidance on first-time insurance registration.",
    category: "Relocation",
    status: "open",
    responderIds: [],
  },
  {
    id: "help_2",
    author: {
      id: "user_1002",
      displayName: "Can A.",
    },
    community: "Turkish",
    countryCode: "DE",
    city: "Berlin",
    createdAt: "2026-03-27T12:30:00.000Z",
    title: "Looking for Turkish-speaking dentist recommendation",
    description: "If you know a good dentist near Mitte, please share contact details.",
    category: "Healthcare",
    status: "open",
    responderIds: ["user_2001"],
  },
];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const toClientRequest = (stored: StoredHelpRequest, viewerId: string): HelpRequest => ({
  id: stored.id,
  author: stored.author,
  community: stored.community,
  countryCode: stored.countryCode,
  city: stored.city,
  createdAt: stored.createdAt,
  title: stored.title,
  description: stored.description,
  category: stored.category,
  status: stored.status,
  responsesCount: stored.responderIds.length,
  viewerState: {
    hasResponded: stored.responderIds.includes(viewerId),
  },
});

export async function getHelpRequests({ viewerId, community, countryCode, city }: GetHelpRequestsInput): Promise<HelpRequest[]> {
  await wait(250);

  if (community?.trim().toLowerCase() === "error-community") {
    throw new Error("Failed to load help requests.");
  }

  return helpRequestsStore
    .filter((item) => {
      if (community && item.community !== community) {
        return false;
      }
      if (countryCode && item.countryCode !== countryCode) {
        return false;
      }
      if (city && item.city !== city) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((item) => toClientRequest(item, viewerId));
}

export async function getHelpRequestById(requestId: string, viewerId: string): Promise<HelpRequest | null> {
  await wait(180);
  const request = helpRequestsStore.find((item) => item.id === requestId);
  return request ? toClientRequest(request, viewerId) : null;
}

export async function createHelpRequest(input: CreateHelpRequestInput): Promise<HelpRequest> {
  await wait(220);

  const storedRequest: StoredHelpRequest = {
    id: `help_${Date.now()}`,
    author: input.author,
    community: input.community,
    countryCode: input.countryCode,
    city: input.city,
    createdAt: new Date().toISOString(),
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category?.trim() || undefined,
    status: "open",
    responderIds: [],
  };

  helpRequestsStore.unshift(storedRequest);

  return toClientRequest(storedRequest, input.author.id);
}

export async function respondToHelpRequest({ requestId, viewerId }: RespondToHelpRequestInput): Promise<HelpRequest | null> {
  await wait(180);

  const request = helpRequestsStore.find((item) => item.id === requestId);
  if (!request) {
    return null;
  }

  if (!request.responderIds.includes(viewerId)) {
    request.responderIds.push(viewerId);
  }

  return toClientRequest(request, viewerId);
}
