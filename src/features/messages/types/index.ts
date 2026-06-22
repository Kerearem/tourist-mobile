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

export type MessageType = "text" | "system" | "image";
export type MessageStatus = "sent" | "delivered" | "read";
export type MessageSystemKind = "help_conversation_started" | "participant_joined" | "other";

export type ConversationMessage = {
  id: string;
  conversationId: string;
  sender: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    role?: "MEMBER" | "ORGANIZER";
  };
  type: MessageType;
  text: string;
  createdAt: string;
  status?: MessageStatus;
  systemKind?: MessageSystemKind;
  isAnnouncement?: boolean;
  mediaUrl?: string;
  mediaType?: "image";
};

export type ConversationMessagesPage = {
  messages: ConversationMessage[];
  pinnedMessage: ConversationMessage | null;
};

export type SendMessageInput = {
  threadId: string;
  sender: {
    id: string;
    displayName: string;
  };
  text?: string;
  isAnnouncement?: boolean;
  mediaUrl?: string;
  mediaType?: "image";
};

export type HelpConversationInput = {
  helpRequestId: string;
  helper: ConversationParticipant;
  requester: ConversationParticipant;
};
