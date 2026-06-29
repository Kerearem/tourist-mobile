import type { CreateEventInput, EventItem, ListEventsQuery, ToggleEventAttendanceInput } from "../types";
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

const withPathParam = (template: string, value: string) => template.replace(":eventId", value);

const buildListQuery = (query?: ListEventsQuery) => {
  if (!query) {
    return "";
  }

  const params = new URLSearchParams();
  if (query.city) params.set("city", query.city);
  if (query.countryCode) params.set("countryCode", query.countryCode);
  if (query.locationScope) params.set("locationScope", query.locationScope);
  if (query.identityScope) params.set("identityScope", query.identityScope);
  if (query.scope) params.set("scope", query.scope);
  if (query.price) params.set("price", query.price);
  if (query.eventTypes?.length) params.set("eventType", query.eventTypes.join(","));
  if (query.dateFilter) params.set("dateFilter", query.dateFilter);
  if (query.search) params.set("search", query.search);
  if (query.hasAlcohol === true) params.set("hasAlcohol", "true");
  if (query.hasAlcohol === false) params.set("hasAlcohol", "false");
  if (query.smokingAllowed === true) params.set("smokingAllowed", "true");
  if (query.smokingAllowed === false) params.set("smokingAllowed", "false");
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
};

const mockEvents: EventItem[] = [
  {
    id: "event_food_festival",
    title: "International Food Festival",
    description: "Meet nearby expats, share favorite dishes, and discover new friends over dinner in Berlin.",
    host: {
      id: "host_berlin_expats",
      displayName: "Berlin Expats",
    },
    type: "social",
    visibility: "city",
    city: "Berlin",
    countryCode: "DE",
    venueName: "Kreuzberg Community Hall",
    timezone: "Europe/Berlin",
    startsAt: "2026-05-24T12:00:00.000Z",
    endsAt: "2026-05-24T16:00:00.000Z",
    attendeeCount: 127,
    capacity: 180,
    isUserAttending: false,
    attendanceStatus: "none",
    tags: ["food", "community", "expats"],
  },
  {
    id: "event_newcomer_workshop",
    title: "Newcomer City Workshop",
    description: "A practical session for finding housing, paperwork tips, and your first local community circle.",
    host: {
      id: "host_tourist_team",
      displayName: "Tourist Community",
    },
    type: "social",
    visibility: "city",
    city: "Berlin",
    countryCode: "DE",
    venueName: "Mitte Welcome Space",
    timezone: "Europe/Berlin",
    startsAt: "2026-05-29T17:30:00.000Z",
    endsAt: "2026-05-29T19:00:00.000Z",
    attendeeCount: 42,
    capacity: 60,
    isUserAttending: true,
    attendanceStatus: "approved",
    hasAlcohol: false,
    smokingAllowed: false,
    tags: ["workshop"],
  },
];

const matchesAlcoholFilter = (event: EventItem, filter?: boolean) => {
  if (filter === undefined) {
    return true;
  }
  return Boolean(event.hasAlcohol) === filter;
};

const matchesSmokingFilter = (event: EventItem, filter?: boolean) => {
  if (filter === undefined) {
    return true;
  }
  return Boolean(event.smokingAllowed) === filter;
};

export async function getEvents(query?: ListEventsQuery): Promise<EventItem[]> {
  if (USE_MOCK_BACKEND) {
    return mockEvents.filter((event) => {
      const matchesPrice =
        !query?.price ||
        (query.price === "free" && !event.metadata?.isPaid) ||
        (query.price === "paid" && event.metadata?.isPaid);
      const matchesType =
        !query?.eventTypes?.length || query.eventTypes.includes(event.type);
      const matchesAlcohol = matchesAlcoholFilter(event, query?.hasAlcohol);
      const matchesSmoking = matchesSmokingFilter(event, query?.smokingAllowed);
      return matchesPrice && matchesType && matchesAlcohol && matchesSmoking;
    });
  }

  const token = await getAccessToken();
  return apiRequest<EventItem[]>(`${API_ENDPOINTS.events.list}${buildListQuery(query)}`, {
    method: "GET",
    token,
  });
}

export async function getEventById(eventId: string): Promise<EventItem | null> {
  if (USE_MOCK_BACKEND) {
    return mockEvents.find((event) => event.id === eventId) ?? null;
  }

  const token = await getAccessToken();
  return apiRequest<EventItem | null>(withPathParam(API_ENDPOINTS.events.detail, eventId), {
    method: "GET",
    token,
  });
}

export async function toggleEventAttendance({ eventId, userId }: ToggleEventAttendanceInput): Promise<EventItem | null> {
  if (USE_MOCK_BACKEND) {
    void userId;
    const event = mockEvents.find((item) => item.id === eventId);
    if (!event) {
      return null;
    }

    const isAttending = Boolean(event.isUserAttending);
    event.isUserAttending = !isAttending;
    event.attendanceStatus = isAttending ? "none" : "pending";
    event.attendeeCount = isAttending ? Math.max(0, event.attendeeCount - 1) : event.attendeeCount + 1;
    return event;
  }

  void userId;
  const token = await getAccessToken();
  return apiRequest<EventItem | null>(withPathParam(API_ENDPOINTS.events.toggleAttendance, eventId), {
    method: "POST",
    token,
  });
}

export async function createEvent(input: CreateEventInput): Promise<EventItem> {
  if (USE_MOCK_BACKEND) {
    const created: EventItem = {
      id: `event_${Date.now()}`,
      title: input.title,
      description: input.description,
      host: {
        id: "mock_host",
        displayName: "Mock Organizer",
      },
      type: input.type ?? "social",
      visibility: input.visibility ?? "city",
      city: input.city,
      countryCode: input.countryCode,
      venueName: input.venueName,
      timezone: input.timezone,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      attendeeCount: 0,
      capacity: input.capacity,
      isUserAttending: false,
      attendanceStatus: "none",
      tags: input.tags,
      ...(input.coverImageUrl ? { coverImageUrl: input.coverImageUrl } : {}),
      ...(input.minAge != null ? { minAge: input.minAge } : { minAge: null }),
      hasAlcohol: input.hasAlcohol ?? false,
      smokingAllowed: input.smokingAllowed ?? false,
      metadata: {
        requiresApproval: input.requiresApproval ?? false,
        status: "PENDING_REVIEW",
      },
    };
    mockEvents.unshift(created);
    return created;
  }

  const token = await getAccessToken();
  return apiRequest<EventItem>(API_ENDPOINTS.events.create, {
    method: "POST",
    token,
    body: input,
  });
}
