import type { AppUser } from "../../../models/user";
import type { EventItem } from "../types";
import type { OrganizerCreatedEventPressTarget } from "./organizerCreatedEventNavigation";
import { resolveOrganizerCreatedEventPressTarget } from "./organizerCreatedEventNavigation";

type EventNavigator = {
  navigate: (screen: string, params?: object) => void;
};

export type EventsTabUserContext = {
  organizerStatus?: AppUser["organizerStatus"] | null;
  accountType?: AppUser["accountType"] | null;
};

export type PersonalEventsSegment<K extends string = string> = {
  key: K;
  label: string;
};

export type CreatedEventsFilter = "active" | "past" | "rejected";
export type AttendedEventsFilter = "upcoming" | "past";

export const CREATED_EVENTS_FILTER_SEGMENTS: ReadonlyArray<PersonalEventsSegment<CreatedEventsFilter>> = [
  { key: "active", label: "Aktif" },
  { key: "past", label: "Geçmiş" },
  { key: "rejected", label: "Reddedildi" },
];

export const ATTENDED_EVENTS_FILTER_SEGMENTS: ReadonlyArray<PersonalEventsSegment<AttendedEventsFilter>> = [
  { key: "upcoming", label: "Yaklaşan" },
  { key: "past", label: "Geçmiş" },
];

export function normalizeCreatedEventsFilter(value: string | undefined): CreatedEventsFilter {
  return value === "past" || value === "rejected" ? value : "active";
}

export function normalizeAttendedEventsFilter(value: string | undefined): AttendedEventsFilter {
  return value === "past" ? value : "upcoming";
}

export type PersonalEventsEmptyState = {
  title: string;
  description: string;
};

export function resolveAttendedEventsEmptyState(): PersonalEventsEmptyState {
  return {
    title: "Katıldığın etkinlik yok",
    description: "Henüz bir etkinliğe katılmadın. Keşfet sekmesinden etkinlik bulabilirsin.",
  };
}

export function resolveCreatedEventsEmptyState(context: EventsTabUserContext): PersonalEventsEmptyState {
  if (context.organizerStatus === "pending") {
    return {
      title: "Organizatör onayı bekleniyor",
      description: "Başvurun incelenirken etkinlik oluşturamazsın. Onay sonrası burada etkinliklerini yönetebilirsin.",
    };
  }

  if (context.organizerStatus === "rejected") {
    return {
      title: "Organizatör başvurun reddedildi",
      description: "Etkinlik oluşturmak için Ayarlar'dan organizatör başvurunu yenileyebilirsin.",
    };
  }

  if (context.organizerStatus === "not_applied") {
    return {
      title: "Henüz organizatör değilsin",
      description: "Kendi etkinliklerini yönetmek için Ayarlar'dan organizatör başvurusu yap.",
    };
  }

  return {
    title: "Oluşturduğun etkinlik yok",
    description: "Henüz bir etkinlik oluşturmadın. Ayarlar'dan yeni etkinlik ekleyebilirsin.",
  };
}

const getEventEndMs = (event: EventItem) =>
  event.endsAt ? new Date(event.endsAt).getTime() : new Date(event.startsAt).getTime();

export function resolveCreatedEventsFilterBucket(event: EventItem, now = Date.now()): CreatedEventsFilter {
  const status = event.metadata?.status;

  if (status === "REJECTED") {
    return "rejected";
  }
  if (status === "COMPLETED" || status === "CANCELLED") {
    return "past";
  }
  if (status === "APPROVED") {
    return getEventEndMs(event) < now ? "past" : "active";
  }
  // DRAFT, PENDING_REVIEW and unknown statuses stay actionable under "active".
  return "active";
}

export function filterCreatedEvents(
  events: EventItem[],
  filter: CreatedEventsFilter,
  now = Date.now(),
): EventItem[] {
  return events.filter((event) => resolveCreatedEventsFilterBucket(event, now) === filter);
}

export function filterAttendedEvents(
  events: EventItem[],
  filter: AttendedEventsFilter,
  now = Date.now(),
): EventItem[] {
  return events.filter((event) => (getEventEndMs(event) < now ? "past" : "upcoming") === filter);
}

export function resolveFilteredEventsEmptyState(
  mode: "created" | "attended",
  filter: CreatedEventsFilter | AttendedEventsFilter,
): PersonalEventsEmptyState {
  if (mode === "created") {
    if (filter === "rejected") {
      return {
        title: "Reddedilen etkinliğin yok",
        description: "Reddedilen etkinlik başvuruların burada listelenir.",
      };
    }
    if (filter === "past") {
      return {
        title: "Geçmiş etkinliğin yok",
        description: "Tamamlanan ve iptal edilen etkinliklerin burada listelenir.",
      };
    }
    return {
      title: "Aktif etkinliğin yok",
      description: "Yayında, incelemede ve taslak etkinliklerin burada listelenir.",
    };
  }

  if (filter === "past") {
    return {
      title: "Geçmiş etkinliğin yok",
      description: "Katıldığın tamamlanmış etkinlikler burada listelenir.",
    };
  }
  return {
    title: "Yaklaşan etkinliğin yok",
    description: "Katıldığın yaklaşan etkinlikler burada görünür.",
  };
}

export function organizerManagedEventStatusLabel(event: EventItem, now = Date.now()): string {
  const status = event.metadata?.status;

  if (status === "APPROVED" && getEventEndMs(event) < now) {
    return "Tamamlandı";
  }
  if (status === "APPROVED") {
    return "Yayında";
  }
  if (status === "PENDING_REVIEW") {
    return "İncelemede";
  }
  if (status === "REJECTED") {
    return "Reddedildi";
  }
  if (status === "CANCELLED") {
    return "İptal";
  }
  if (status === "COMPLETED") {
    return "Tamamlandı";
  }
  if (status === "DRAFT") {
    return "Taslak";
  }

  return "Bilinmiyor";
}

export function attendedEventStatusLabel(event: EventItem): string {
  if (event.attendanceStatus === "approved") {
    return "Katıldın";
  }
  if (event.attendanceStatus === "pending") {
    return "Onay Bekliyor";
  }
  return "Katılım";
}

export type AttendedEventPressTarget = { kind: "public-detail"; eventId: string };

export function resolveAttendedEventPressTarget(event: EventItem): AttendedEventPressTarget {
  return { kind: "public-detail", eventId: event.id };
}

export function resolveCreatedEventPressTarget(event: EventItem): OrganizerCreatedEventPressTarget {
  return resolveOrganizerCreatedEventPressTarget(event);
}

export function navigateAttendedEventDetail(navigation: EventNavigator, event: EventItem) {
  const target = resolveAttendedEventPressTarget(event);
  navigation.navigate("EventDetailScreen", { eventId: target.eventId });
}

export function navigateCreatedEventTarget(navigation: EventNavigator, event: EventItem) {
  const target = resolveCreatedEventPressTarget(event);
  if (target.kind === "public-detail") {
    navigation.navigate("EventDetailScreen", { eventId: target.eventId });
    return;
  }
  if (target.kind === "album") {
    navigation.navigate("EventAlbumScreen", { eventId: target.eventId });
    return;
  }
  navigation.navigate("OrganizerEventSubmissionScreen", { event: target.event });
}
