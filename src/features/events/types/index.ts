export type EventType = "social" | "community" | "help" | "other";
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
  type: EventType;
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
  tags?: string[];
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
  type?: EventType;
  visibility?: EventVisibility;
  capacity?: number;
  timezone?: string;
  tags?: string[];
};

export type ListEventsQuery = {
  city?: string;
  countryCode?: string;
  type?: EventType;
  scope?: "community" | "global";
  page?: number;
  limit?: number;
};
