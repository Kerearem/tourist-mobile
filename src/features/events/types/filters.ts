export type DateFilterOption = "today" | "tomorrow" | "this_weekend" | "this_week" | "choose_date";
export type PriceFilterOption = "any" | "free" | "paid";
export type EventTypeFilterOption =
  | "social"
  | "networking"
  | "food"
  | "outdoor"
  | "student"
  | "workshop"
  | "culture"
  | "sports"
  | "gaming"
  | "language"
  | "expat"
  | "career"
  | "nightlife"
  | "coffee"
  | "dinner"
  | "meetup"
  | "travel"
  | "wellness"
  | "tech"
  | "volunteering";
export type CommunityFilterOption = "my_community" | "all_communities";
export type DistanceFilterOption = "nearby" | "5km" | "10km" | "anywhere_city";
export type VibeFilterOption = "alcohol_free" | "family_friendly" | "chill" | "party" | "beginner_friendly";
export type AttendanceFilterOption = "available_spots" | "almost_full" | "verified_organizer";

export type FilterOption<T extends string> = {
  value: T;
  label: string;
};

export type EventsFilterState = {
  date: DateFilterOption | null;
  price: PriceFilterOption;
  eventTypes: EventTypeFilterOption[];
  community: CommunityFilterOption;
  distance: DistanceFilterOption;
  vibe: VibeFilterOption[];
  attendance: AttendanceFilterOption[];
};

export const DATE_FILTERS: Array<FilterOption<DateFilterOption>> = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "this_weekend", label: "This weekend" },
  { value: "this_week", label: "This week" },
  { value: "choose_date", label: "Custom date" },
];

export const PRICE_FILTERS: Array<FilterOption<PriceFilterOption>> = [
  { value: "any", label: "Any" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

export const EVENT_TYPE_FILTERS: Array<FilterOption<EventTypeFilterOption>> = [
  { value: "social", label: "Social" },
  { value: "networking", label: "Networking" },
  { value: "food", label: "Food" },
  { value: "outdoor", label: "Outdoor" },
  { value: "student", label: "Student" },
  { value: "workshop", label: "Workshop" },
  { value: "culture", label: "Culture" },
  { value: "sports", label: "Sports" },
  { value: "gaming", label: "Gaming" },
  { value: "language", label: "Language" },
  { value: "expat", label: "Expat" },
  { value: "career", label: "Career" },
  { value: "nightlife", label: "Nightlife" },
  { value: "coffee", label: "Coffee" },
  { value: "dinner", label: "Dinner" },
  { value: "meetup", label: "Meetup" },
  { value: "travel", label: "Travel" },
  { value: "wellness", label: "Wellness" },
  { value: "tech", label: "Tech" },
  { value: "volunteering", label: "Volunteering" },
];

export const COMMUNITY_FILTERS: Array<FilterOption<CommunityFilterOption>> = [
  { value: "my_community", label: "My community only" },
  { value: "all_communities", label: "All communities" },
];

export const DISTANCE_FILTERS: Array<FilterOption<DistanceFilterOption>> = [
  { value: "nearby", label: "Nearby" },
  { value: "5km", label: "5 km" },
  { value: "10km", label: "10 km" },
  { value: "anywhere_city", label: "City-wide" },
];

export const VIBE_FILTERS: Array<FilterOption<VibeFilterOption>> = [
  { value: "alcohol_free", label: "Alcohol-free" },
  { value: "family_friendly", label: "Family-friendly" },
  { value: "chill", label: "Chill" },
  { value: "party", label: "Party" },
  { value: "beginner_friendly", label: "Beginner friendly" },
];

export const ATTENDANCE_FILTERS: Array<FilterOption<AttendanceFilterOption>> = [
  { value: "available_spots", label: "Available spots" },
  { value: "almost_full", label: "Almost full" },
  { value: "verified_organizer", label: "Verified organizer" },
];

export const DEFAULT_EVENTS_FILTERS: EventsFilterState = {
  date: null,
  price: "any",
  eventTypes: [],
  community: "all_communities",
  distance: "anywhere_city",
  vibe: [],
  attendance: [],
};
