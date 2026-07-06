export type ExploreReelEventSummary = {
  id: string;
  status: string;
};

export type ExploreReelEventNavigationTarget = "detail" | "album";

export function resolveExploreReelEventNavigationTarget(
  status: string,
): ExploreReelEventNavigationTarget | null {
  if (status === "APPROVED") {
    return "detail";
  }

  if (status === "COMPLETED") {
    return "album";
  }

  return null;
}

export function shouldShowExploreReelEventTag(
  isReel: boolean,
  event: ExploreReelEventSummary | null | undefined,
  isReportedHidden: boolean,
): boolean {
  if (!isReel || isReportedHidden || !event) {
    return false;
  }

  return resolveExploreReelEventNavigationTarget(event.status) !== null;
}
