import type { OrganizerStatus } from "../../../models/user";

export type OrganizerApplicationInfo = {
  id: string;
  reason?: string;
  status: OrganizerStatus;
  type: string;
  createdAt: string;
};

export type OrganizerStatusResponse = {
  organizerStatus: OrganizerStatus;
  application?: OrganizerApplicationInfo;
  hasActiveEvent?: boolean;
  activeEventTitle?: string;
};

export type ApplyOrganizerInput = {
  reason: string;
};
