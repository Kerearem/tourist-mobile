import type { ListEventsQuery } from "./index";
import type { EventType } from "../constants/eventTypes";
import { EVENT_TYPES } from "../constants/eventTypes";

export type DateFilterOption = "today" | "tomorrow" | "this_weekend" | "this_week" | "choose_date";
export type PriceFilterOption = "any" | "free" | "paid";
export type EventTypeFilterOption = EventType;
export type CommunityFilterOption = "my_community" | "all_communities";
export type AlcoholFilterOption = "any" | "alcoholic" | "non_alcoholic";
export type SmokingFilterOption = "any" | "allowed" | "not_allowed";

export type FilterOption<T extends string> = {
  value: T;
  label: string;
};

export type EventsFilterState = {
  date: DateFilterOption | null;
  price: PriceFilterOption;
  eventTypes: EventTypeFilterOption[];
  community: CommunityFilterOption;
  alcohol: AlcoholFilterOption;
  smoking: SmokingFilterOption;
};

export const DATE_FILTERS: Array<FilterOption<DateFilterOption>> = [
  { value: "today", label: "Bugün" },
  { value: "tomorrow", label: "Yarın" },
  { value: "this_weekend", label: "Bu hafta sonu" },
  { value: "this_week", label: "Bu hafta" },
];

export const PRICE_FILTERS: Array<FilterOption<PriceFilterOption>> = [
  { value: "any", label: "Tümü" },
  { value: "free", label: "Ücretsiz" },
  { value: "paid", label: "Ücretli" },
];

export const EVENT_TYPE_FILTERS: Array<FilterOption<EventTypeFilterOption>> = EVENT_TYPES.map((item) => ({
  value: item.value,
  label: item.label,
}));

export const COMMUNITY_FILTERS: Array<FilterOption<CommunityFilterOption>> = [
  { value: "my_community", label: "Topluluğum" },
  { value: "all_communities", label: "Tüm topluluklar" },
];

export const ALCOHOL_FILTERS: Array<FilterOption<AlcoholFilterOption>> = [
  { value: "any", label: "Farketmez" },
  { value: "alcoholic", label: "Alkollü" },
  { value: "non_alcoholic", label: "Alkolsüz" },
];

export const SMOKING_FILTERS: Array<FilterOption<SmokingFilterOption>> = [
  { value: "any", label: "Farketmez" },
  { value: "allowed", label: "Sigara serbest" },
  { value: "not_allowed", label: "Değil" },
];

export const DEFAULT_EVENTS_FILTERS: EventsFilterState = {
  date: null,
  price: "any",
  eventTypes: [],
  community: "all_communities",
  alcohol: "any",
  smoking: "any",
};

export const mapDateFilterToApi = (date: DateFilterOption | null): string | undefined => {
  if (!date) {
    return undefined;
  }

  switch (date) {
    case "today":
      return "today";
    case "tomorrow":
      return "tomorrow";
    case "this_weekend":
      return "weekend";
    case "this_week":
      return "thisweek";
    default:
      return undefined;
  }
};

export const buildEventsListQuery = (
  filters: EventsFilterState,
  options: { search?: string },
): ListEventsQuery => {
  const query: ListEventsQuery = {
    scope: filters.community === "my_community" ? "community" : "global",
  };

  const search = options.search?.trim();
  if (search) {
    query.search = search;
  }

  const dateFilter = mapDateFilterToApi(filters.date);
  if (dateFilter) {
    query.dateFilter = dateFilter;
  }

  if (filters.price !== "any") {
    query.price = filters.price;
  }
  if (filters.eventTypes.length > 0) {
    query.eventTypes = [...filters.eventTypes];
  }
  if (filters.alcohol === "alcoholic") {
    query.hasAlcohol = true;
  } else if (filters.alcohol === "non_alcoholic") {
    query.hasAlcohol = false;
  }
  if (filters.smoking === "allowed") {
    query.smokingAllowed = true;
  } else if (filters.smoking === "not_allowed") {
    query.smokingAllowed = false;
  }

  return query;
};
