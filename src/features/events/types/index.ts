export type { EventType } from "../constants/eventTypes";
export type EventVisibility = "city" | "country" | "private";
export type EventAttendanceStatus = "none" | "pending" | "approved";

export type EventHost = {
  id: string;
  displayName: string;
  avatarUrl?: string;
};

export type EventItem = {
  id: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  host: EventHost;
  type: import("../constants/eventTypes").EventType;
  visibility: EventVisibility;
  city: string;
  countryCode: string;
  venueName?: string;
  timezone?: string;
  startsAt: string;
  endsAt?: string;
  attendeeCount: number;
  capacity?: number;
  isUserAttending?: boolean;
  attendanceStatus?: EventAttendanceStatus;
  canJoin?: boolean;
  joinBlockReason?: string;
  tags?: string[];
  minAge?: number | null;
  hasAlcohol?: boolean;
  smokingAllowed?: boolean;
  averageRating?: number | null;
  ratingCount?: number;
  metadata?: Record<string, unknown>;
};

export type ToggleEventAttendanceInput = {
  eventId: string;
  userId: string;
};

export type CreateEventInput = {
  title: string;
  description: string;
  city: string;
  countryCode: string;
  venueName: string;
  startsAt: string;
  endsAt: string;
  coverImageUrl?: string;
  requiresApproval?: boolean;
  type: import("../constants/eventTypes").EventType;
  isPaid?: boolean;
  price?: number;
  priceCurrency?: "EUR" | "USD" | "TRY" | "GBP";
  visibility?: EventVisibility;
  capacity?: number;
  timezone?: string;
  tags?: string[];
  minAge?: 18 | 21;
  hasAlcohol?: boolean;
  smokingAllowed?: boolean;
};

export type ListEventsQuery = {
  city?: string;
  countryCode?: string;
  locationScope?: "city" | "country";
  identityScope?: "nationality" | "everyone";
  /** @deprecated Use locationScope + identityScope */
  scope?: "community" | "global";
  price?: "free" | "paid";
  eventTypes?: import("../constants/eventTypes").EventType[];
  dateFilter?: string;
  search?: string;
  hasAlcohol?: boolean;
  smokingAllowed?: boolean;
  page?: number;
  limit?: number;
};

export type EventAlbum = {
  event: EventItem;
  averageRating: number | null;
  ratingCount: number;
  viewerRating: number | null;
  viewerIsParticipant: boolean;
  canRate: boolean;
  moments: [];
};

export type EventRatingResult = {
  rating: number;
  averageRating: number | null;
  ratingCount: number;
};
