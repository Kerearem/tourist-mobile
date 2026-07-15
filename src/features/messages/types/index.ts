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
export const ALLOWED_MESSAGE_REACTIONS = ["❤️", "😂", "👍", "😮", "😢", "🙏"] as const;
export type AllowedMessageReaction = (typeof ALLOWED_MESSAGE_REACTIONS)[number];

export type MessageReplyPreview = {
  id: string;
  sender: { displayName: string };
  text: string;
  type: MessageType;
};

export type MessageReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

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
  replyTo?: MessageReplyPreview;
  reactions?: MessageReactionSummary[];
};

export type ConversationMessagesPage = {
  messages: ConversationMessage[];
  pinnedMessage: ConversationMessage | null;
};

export type ConversationParticipantProfile = {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  accountType: "personal" | "business";
  isOrganizer: boolean;
};

export type ConversationInfo = {
  conversation: ConversationThread;
  otherParticipant?: ConversationParticipantProfile;
  sharedMediaPreview: ConversationMessage[];
};

export type ConversationSearchResult = {
  messages: ConversationMessage[];
  query: string;
  page: number;
  limit: number;
  total: number;
};

export type ConversationMediaResult = {
  messages: ConversationMessage[];
  page: number;
  limit: number;
  total: number;
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
  replyToMessageId?: string;
};

export type HelpConversationInput = {
  helpRequestId: string;
  helper: ConversationParticipant;
  requester: ConversationParticipant;
};
