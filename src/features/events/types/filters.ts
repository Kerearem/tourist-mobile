import type { ListEventsQuery } from "./index";
import type { EventType } from "../constants/eventTypes";
import { EVENT_TYPES } from "../constants/eventTypes";
import {
  DEFAULT_HELP_IDENTITY_SCOPE,
  DEFAULT_HELP_LOCATION_SCOPE,
  HELP_IDENTITY_SCOPE_OPTIONS,
  HELP_LOCATION_SCOPE_OPTIONS,
  type HelpIdentityScope,
  type HelpLocationScope,
} from "../../help/constants/helpCategories";

export type DateFilterOption = "today" | "tomorrow" | "this_weekend" | "this_week" | "choose_date";
export type PriceFilterOption = "free" | "paid";
export type EventTypeFilterOption = EventType;
export type EventLocationScope = HelpLocationScope;
export type EventIdentityScope = HelpIdentityScope;
export type AlcoholFilterOption = "alcoholic" | "non_alcoholic";
export type SmokingFilterOption = "allowed" | "not_allowed";

export type FilterOption<T extends string> = {
  value: T;
  label: string;
};

export type EventsFilterState = {
  date: DateFilterOption | null;
  price: PriceFilterOption | null;
  eventTypes: EventTypeFilterOption[];
  locationScope: EventLocationScope;
  identityScope: EventIdentityScope;
  alcohol: AlcoholFilterOption | null;
  smoking: SmokingFilterOption | null;
};

export const DATE_FILTERS: Array<FilterOption<DateFilterOption>> = [
  { value: "today", label: "Bugün" },
  { value: "tomorrow", label: "Yarın" },
  { value: "this_weekend", label: "Bu hafta sonu" },
  { value: "this_week", label: "Bu hafta" },
];

export const PRICE_FILTERS: Array<FilterOption<PriceFilterOption>> = [
  { value: "free", label: "Ücretsiz" },
  { value: "paid", label: "Ücretli" },
];

export const EVENT_TYPE_FILTERS: Array<FilterOption<EventTypeFilterOption>> = EVENT_TYPES.map((item) => ({
  value: item.value,
  label: item.label,
}));

export const EVENT_LOCATION_SCOPE_OPTIONS = HELP_LOCATION_SCOPE_OPTIONS;
export const EVENT_IDENTITY_SCOPE_OPTIONS = HELP_IDENTITY_SCOPE_OPTIONS;

export const ALCOHOL_FILTERS: Array<FilterOption<AlcoholFilterOption>> = [
  { value: "alcoholic", label: "Alkollü" },
  { value: "non_alcoholic", label: "Alkolsüz" },
];

export const SMOKING_FILTERS: Array<FilterOption<SmokingFilterOption>> = [
  { value: "allowed", label: "Sigara serbest" },
  { value: "not_allowed", label: "Değil" },
];

export const DEFAULT_EVENTS_FILTERS: EventsFilterState = {
  date: null,
  price: null,
  eventTypes: [],
  locationScope: DEFAULT_HELP_LOCATION_SCOPE,
  identityScope: DEFAULT_HELP_IDENTITY_SCOPE,
  alcohol: null,
  smoking: null,
};

export const getEventsFilterSummary = (
  locationScope: EventLocationScope,
  identityScope: EventIdentityScope,
): string => {
  const locationLabel =
    EVENT_LOCATION_SCOPE_OPTIONS.find((item) => item.value === locationScope)?.label ?? "Şehrim";
  const identityLabel =
    EVENT_IDENTITY_SCOPE_OPTIONS.find((item) => item.value === identityScope)?.label ?? "Herkes";
  return `${locationLabel} · ${identityLabel}`;
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
    locationScope: filters.locationScope,
    identityScope: filters.identityScope,
  };

  const search = options.search?.trim();
  if (search) {
    query.search = search;
  }

  const dateFilter = mapDateFilterToApi(filters.date);
  if (dateFilter) {
    query.dateFilter = dateFilter;
  }

  if (filters.price) {
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
