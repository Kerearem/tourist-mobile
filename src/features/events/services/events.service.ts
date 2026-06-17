import type { EventItem, ToggleEventAttendanceInput } from "../types";
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
    type: "community",
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
    tags: ["newcomers", "workshop"],
  },
];

export async function getEvents(): Promise<EventItem[]> {
  if (USE_MOCK_BACKEND) {
    return mockEvents;
  }

  const token = await getAccessToken();
  return apiRequest<EventItem[]>(API_ENDPOINTS.events.list, {
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
