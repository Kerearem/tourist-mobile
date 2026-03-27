export type ConversationType = "direct" | "help" | "group";

export type ConversationParticipant = {
  id: string;
  displayName: string;
  avatarUrl?: string;
};

export type ConversationThread = {
  id: string;
  type: ConversationType;
  title?: string;
  participants: ConversationParticipant[];
  createdAt: string;
  updatedAt: string;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  helpRequestId?: string;
  metadata?: Record<string, string>;
};

export type MessageType = "text" | "system";
export type MessageStatus = "sent" | "delivered" | "read";
export type MessageSystemKind = "help_conversation_started" | "participant_joined" | "other";

export type ConversationMessage = {
  id: string;
  conversationId: string;
  sender: {
    id: string;
    displayName: string;
  };
  type: MessageType;
  text: string;
  createdAt: string;
  status?: MessageStatus;
  systemKind?: MessageSystemKind;
};

export type SendMessageInput = {
  threadId: string;
  sender: {
    id: string;
    displayName: string;
  };
  text: string;
};

export type HelpConversationInput = {
  helpRequestId: string;
  helper: ConversationParticipant;
  requester: ConversationParticipant;
};
