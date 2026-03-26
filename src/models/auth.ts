import type { ID } from "./common";

export type AuthGateStatus =
  | "booting"
  | "signed_out"
  | "needs_phone_verification"
  | "needs_email_verification"
  | "needs_onboarding"
  | "ready";

export type AuthSession = {
  sessionId: ID;
  userId: ID;
  createdAt: string;
};
