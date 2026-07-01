import type { OrganizerStatus } from "../models/user";

export type AccountType = "personal" | "business";
export type VerificationBadgeType = "organizer" | "business";

export function resolveVerificationBadge(input: {
  verificationBadge?: VerificationBadgeType | null;
  accountType?: AccountType | null;
  organizerStatus?: OrganizerStatus | null;
  isOrganizer?: boolean;
}): VerificationBadgeType | null {
  if (input.verificationBadge) {
    return input.verificationBadge;
  }

  const isOrganizer = input.isOrganizer ?? input.organizerStatus === "approved";
  if (!isOrganizer) {
    return null;
  }

  if (input.accountType === "business") {
    return "business";
  }

  return "organizer";
}
