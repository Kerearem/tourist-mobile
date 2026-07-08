import type { ConversationMessage, ConversationThread } from "../types";

export const MESSAGE_REALTIME_EVENT_VERSION = 1 as const;

export const MESSAGE_REALTIME_EVENTS = {
  messageNew: "message:new",
  conversationUpdated: "conversation:updated",
} as const;

export type MessageRealtimeEnvelope<TPayload> = {
  v: typeof MESSAGE_REALTIME_EVENT_VERSION;
  eventId: string;
  emittedAt: string;
  payload: TPayload;
};

export type MessageNewEvent = MessageRealtimeEnvelope<{
  conversationId: string;
  message: ConversationMessage;
}>;

export type ConversationUpdatedEvent = MessageRealtimeEnvelope<{
  conversation: ConversationThread;
}>;
