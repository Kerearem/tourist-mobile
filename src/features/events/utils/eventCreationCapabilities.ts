import type { EventCreationCapabilities } from "../types/eventCreation";

export const DEFAULT_EVENT_CREATION_CAPABILITIES: EventCreationCapabilities = {
  maxConcurrentActiveEvents: 1,
  maxTicketOptionsPerEvent: 1,
  canUseMultipleTicketOptions: false,
  canUsePackageInclusions: false,
};
