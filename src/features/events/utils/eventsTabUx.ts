import type { AppUser } from "../../../models/user";
import type { EventItem } from "../types";
import type { OrganizerCreatedEventPressTarget } from "./organizerCreatedEventNavigation";
import { resolveOrganizerCreatedEventPressTarget } from "./organizerCreatedEventNavigation";

type EventNavigator = {
  navigate: (screen: string, params?: object) => void;
};

export type EventsTabSection = "discover" | "attended" | "created";

export type EventsTabUserContext = {
  organizerStatus?: AppUser["organizerStatus"] | null;
  accountType?: AppUser["accountType"] | null;
};

export type EventsTabSegment = {
  key: EventsTabSection;
  label: string;
};

export const EVENTS_TAB_SEGMENT_LABELS = {
  discover: "Keşfet",
  attended: "Katıldığım Etkinlikler",
  created: "Oluşturduğum Etkinlikler",
} as const;

export function shouldShowOrganizerCreatedSection(context: EventsTabUserContext): boolean {
  return context.organizerStatus === "approved";
}

export function resolveEventsTabSegments(context: EventsTabUserContext): EventsTabSegment[] {
  const segments: EventsTabSegment[] = [
    { key: "discover", label: EVENTS_TAB_SEGMENT_LABELS.discover },
    { key: "attended", label: EVENTS_TAB_SEGMENT_LABELS.attended },
  ];

  if (shouldShowOrganizerCreatedSection(context)) {
    segments.push({ key: "created", label: EVENTS_TAB_SEGMENT_LABELS.created });
  }

  return segments;
}

export function normalizeEventsTabSection(
  section: EventsTabSection | undefined,
  context: EventsTabUserContext,
): EventsTabSection {
  const allowed = new Set(resolveEventsTabSegments(context).map((item) => item.key));
  if (section && allowed.has(section)) {
    return section;
  }
  return "discover";
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
