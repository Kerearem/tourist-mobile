import type {
  ConversationMessage,
  ConversationThread,
  MessageReactionSummary,
  MessageStatus,
} from "../types";

export const MESSAGE_REALTIME_EVENT_VERSION = 1 as const;

export const MESSAGE_REALTIME_EVENTS = {
  messageNew: "message:new",
  conversationUpdated: "conversation:updated",
  messageReceipts: "message:receipts",
  messageReaction: "message:reaction",
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

export type MessageReceiptsEvent = MessageRealtimeEnvelope<{
  conversationId: string;
  updates: Array<{ messageId: string; status: Extract<MessageStatus, "delivered" | "read"> }>;
}>;

export type MessageReactionEvent = MessageRealtimeEnvelope<{
  conversationId: string;
  messageId: string;
  reactions: MessageReactionSummary[];
}>;
