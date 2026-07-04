import type { EventItem } from "../types";

const getEventEndMs = (event: EventItem) =>
  event.endsAt ? new Date(event.endsAt).getTime() : new Date(event.startsAt).getTime();

export const eventStatusLabel = (event: EventItem, now = Date.now()) => {
  const status = event.metadata?.status;
  if (status === "APPROVED" && getEventEndMs(event) < now) {
    return "Tamamlandı";
  }
  if (status === "APPROVED") return "Onaylandı";
  if (status === "PENDING_REVIEW") return "İncelemede";
  if (status === "REJECTED") return "Reddedildi";
  if (status === "DRAFT") return "Taslak";
  if (status === "CANCELLED") return "İptal";
  if (status === "COMPLETED") return "Tamamlandı";
  return "Bilinmiyor";
};
