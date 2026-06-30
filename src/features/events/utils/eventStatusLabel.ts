import type { EventItem } from "../types";

export const eventStatusLabel = (event: EventItem) => {
  const status = event.metadata?.status;
  if (status === "APPROVED") return "Onaylandı";
  if (status === "PENDING_REVIEW") return "İncelemede";
  if (status === "REJECTED") return "Reddedildi";
  if (status === "DRAFT") return "Taslak";
  if (status === "CANCELLED") return "İptal";
  if (status === "COMPLETED") return "Tamamlandı";
  return "Bilinmiyor";
};
