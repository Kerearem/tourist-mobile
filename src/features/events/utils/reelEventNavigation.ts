export type ReelEventNavigationSummary = {
  id: string;
  status: string;
};

export type ReelEventNavigationTarget = "detail" | "album";

export function resolveReelEventStatus(status: string | null | undefined): string {
  return typeof status === "string" ? status : "";
}

export function resolveReelEventNavigationTarget(
  status: string | null | undefined,
): ReelEventNavigationTarget | null {
  const normalized = resolveReelEventStatus(status);

  if (normalized === "APPROVED") {
    return "detail";
  }

  if (normalized === "COMPLETED") {
    return "album";
  }

  return null;
}

export function shouldShowReelEventTag(
  isReel: boolean,
  event: ReelEventNavigationSummary | null | undefined,
  isReportedHidden: boolean,
): boolean {
  if (!isReel || isReportedHidden || !event) {
    return false;
  }

  return resolveReelEventNavigationTarget(event.status) !== null;
}

export type ReelEventNavigationHandlers = {
  onDetail?: (eventId: string) => void;
  onAlbum?: (eventId: string) => void;
};

export function pressReelEventNavigationTarget(
  event: ReelEventNavigationSummary,
  handlers: ReelEventNavigationHandlers,
): void {
  const target = resolveReelEventNavigationTarget(event.status);

  if (target === "detail") {
    handlers.onDetail?.(event.id);
    return;
  }

  if (target === "album") {
    handlers.onAlbum?.(event.id);
  }
}
