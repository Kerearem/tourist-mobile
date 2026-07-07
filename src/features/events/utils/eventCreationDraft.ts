import type { EventCreationDraft } from "../types/eventCreation";

const buildDefaultStart = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(18, 0, 0, 0);
  return date;
};

const addHours = (date: Date, hours: number) => {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
};

export function createInitialEventCreationDraft(input?: {
  city?: string;
  countryCode?: string;
  timezone?: string;
}): EventCreationDraft {
  const defaultStart = buildDefaultStart();

  return {
    title: "",
    description: "",
    eventType: null,
    coverUri: null,
    startsAt: defaultStart,
    endsAt: addHours(defaultStart, 2),
    venueName: "",
    city: input?.city ?? "",
    countryCode: input?.countryCode ?? "",
    timezone: input?.timezone ?? "",
    capacityInput: "",
    visibility: "city",
    minAge: null,
    hasAlcohol: false,
    smokingAllowed: false,
    ticketMode: "free",
    tokenPriceInput: "",
  };
}
