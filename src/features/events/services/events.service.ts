import type { EventItem, ToggleEventAttendanceInput } from "../types";

type StoredEvent = Omit<EventItem, "isUserAttending"> & {
  attendeeIds: string[];
};

const eventsStore: StoredEvent[] = [
  {
    id: "event_1",
    title: "Berlin Community Coffee Meetup",
    description: "Casual meetup for newcomers to connect and ask relocation questions.",
    host: {
      id: "user_1001",
      displayName: "Ayse K.",
    },
    type: "community",
    visibility: "city",
    city: "Berlin",
    countryCode: "DE",
    venueName: "Kreuzberg Social Cafe",
    startsAt: "2026-03-30T17:00:00.000Z",
    attendeeCount: 14,
    capacity: 40,
    tags: ["meetup", "newcomers"],
    metadata: {
      language: "Turkish + English",
    },
    attendeeIds: ["user_2001", "user_2002"],
  },
  {
    id: "event_2",
    title: "Germany-wide Housing Q&A Live Session",
    description: "Online Q&A with people who recently found rental homes in major cities.",
    host: {
      id: "user_1002",
      displayName: "Can A.",
    },
    type: "help",
    visibility: "country",
    city: "Hamburg",
    countryCode: "DE",
    startsAt: "2026-04-02T19:30:00.000Z",
    attendeeCount: 52,
    tags: ["housing", "q&a"],
    metadata: {
      format: "online",
    },
    attendeeIds: [],
  },
];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const toEventItem = (stored: StoredEvent, userId = ""): EventItem => ({
  id: stored.id,
  title: stored.title,
  description: stored.description,
  coverImageUrl: stored.coverImageUrl,
  host: stored.host,
  type: stored.type,
  visibility: stored.visibility,
  city: stored.city,
  countryCode: stored.countryCode,
  venueName: stored.venueName,
  startsAt: stored.startsAt,
  endsAt: stored.endsAt,
  attendeeCount: stored.attendeeCount,
  capacity: stored.capacity,
  isUserAttending: userId ? stored.attendeeIds.includes(userId) : false,
  tags: stored.tags,
  metadata: stored.metadata,
});

export async function getEvents(): Promise<EventItem[]> {
  await wait(240);
  return [...eventsStore]
    .sort((a, b) => (a.startsAt > b.startsAt ? 1 : -1))
    .map((item) => toEventItem(item));
}

export async function getEventById(eventId: string): Promise<EventItem | null> {
  await wait(180);
  const event = eventsStore.find((item) => item.id === eventId);
  return event ? toEventItem(event) : null;
}

export async function toggleEventAttendance({ eventId, userId }: ToggleEventAttendanceInput): Promise<EventItem | null> {
  await wait(160);

  const event = eventsStore.find((item) => item.id === eventId);
  if (!event) {
    return null;
  }

  const isAttending = event.attendeeIds.includes(userId);
  if (isAttending) {
    event.attendeeIds = event.attendeeIds.filter((id) => id !== userId);
    event.attendeeCount = Math.max(0, event.attendeeCount - 1);
  } else {
    event.attendeeIds.push(userId);
    event.attendeeCount += 1;
  }

  return toEventItem(event, userId);
}
