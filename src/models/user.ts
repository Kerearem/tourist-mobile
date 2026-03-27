import type { ID } from "./common";

export type OrganizerStatus = "not_applied" | "pending" | "approved" | "rejected";

export type AppUser = {
  id: ID;
  displayName: string;
  community: string;
  homeCountryCode: string;
  currentCountryCode: string;
  currentCity: string;
  hasCompletedOnboarding: boolean;
  hasPhoneVerification: boolean;
  hasEmailVerification: boolean;
  organizerStatus: OrganizerStatus;
};
