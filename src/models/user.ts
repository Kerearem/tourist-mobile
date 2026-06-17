import type { ID } from "./common";

export type OrganizerStatus = "not_applied" | "pending" | "approved" | "rejected";
export type UserRole = "user" | "organizer" | "admin";
export type LanguageLevel = "basic" | "intermediate" | "advanced" | "native";
export type RelocationReason = "study" | "work" | "travel" | "family" | "other";

export type UserLanguage = {
  code: string;
  level: LanguageLevel;
};

export type AppUserPublicProfile = {
  displayName: string;
  username: string;
  usernameLower: string;
  homeCommunity: string;
  currentCity: string;
  interests: string[];
};

export type AppUserPrivateProfile = {
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  birthDate: string;
  nationalityCountryCode: string;
  destinationCountryCode: string;
  destinationCity: string;
  relocationReason: RelocationReason | null;
  spokenLanguages: UserLanguage[];
};

export type AppUser = {
  id: ID;
  roles: UserRole[];
  organizerStatus: OrganizerStatus;
  hasPhoneVerification: boolean;
  hasEmailVerification: boolean;
  consentAccepted: boolean;
  isUsernameSet: boolean;
  createdAt: string;
  updatedAt: string;
  publicProfile: AppUserPublicProfile;
  privateProfile: AppUserPrivateProfile;
};
