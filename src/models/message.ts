import type { ID, ISODateString } from "./common";

export type Message = {
  id: ID;
  threadId: ID;
  senderId: ID;
  text: string;
  createdAt: ISODateString;
};

export type ChatThread = {
  id: ID;
  participantIds: ID[];
  lastMessageAt: ISODateString;
};
