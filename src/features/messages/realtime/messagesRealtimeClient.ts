import { AppState, type AppStateStatus } from "react-native";
import { io, type Socket } from "socket.io-client";

import { API_BASE_URL, USE_MOCK_BACKEND } from "../../../constants/env";
import { loadAuthState } from "../../../services/api/authSession";
import type { ConversationUpdatedEvent, MessageNewEvent } from "./messageRealtimeEvents";
import { MESSAGE_REALTIME_EVENTS } from "./messageRealtimeEvents";
import {
  clearAppStateSubscription,
  resolveSocketConnectNotification,
} from "./messagesRealtimeConnectLifecycle";
import { resolveSocketOrigin } from "./resolveSocketOrigin";

type MessageNewHandler = (event: MessageNewEvent) => void;
type ConversationUpdatedHandler = (event: ConversationUpdatedEvent) => void;
type ReconnectHandler = () => void;

class MessagesRealtimeClient {
  private socket: Socket | null = null;
  private connectionKey: string | null = null;
  private hasConnectedOnce = false;
  private readonly messageNewHandlers = new Set<MessageNewHandler>();
  private readonly conversationUpdatedHandlers = new Set<ConversationUpdatedHandler>();
  private readonly reconnectHandlers = new Set<ReconnectHandler>();
  private appStateSubscription: { remove: () => void } | null = null;

  onMessageNew(handler: MessageNewHandler): () => void {
    this.messageNewHandlers.add(handler);
    return () => {
      this.messageNewHandlers.delete(handler);
    };
  }

  onConversationUpdated(handler: ConversationUpdatedHandler): () => void {
    this.conversationUpdatedHandlers.add(handler);
    return () => {
      this.conversationUpdatedHandlers.delete(handler);
    };
  }

  onReconnect(handler: ReconnectHandler): () => void {
    this.reconnectHandlers.add(handler);
    return () => {
      this.reconnectHandlers.delete(handler);
    };
  }

  async connectForCurrentSession(userId: string): Promise<void> {
    if (USE_MOCK_BACKEND) {
      this.disconnect();
      return;
    }

    const authState = await loadAuthState();
    const accessToken = authState?.tokens.accessToken?.trim();
    if (!accessToken || !authState || authState.user.id !== userId) {
      this.disconnect();
      return;
    }

    const nextConnectionKey = `${userId}:${accessToken}`;
    if (this.socket?.connected && this.connectionKey === nextConnectionKey) {
      return;
    }

    this.disconnect();
    this.connectionKey = nextConnectionKey;
    this.ensureAppStateListener();

    this.socket = io(resolveSocketOrigin(API_BASE_URL), {
      path: "/socket.io",
      auth: { token: accessToken },
      transports: ["websocket"],
      autoConnect: true,
    });

    this.socket.on(MESSAGE_REALTIME_EVENTS.messageNew, (event: MessageNewEvent) => {
      for (const handler of this.messageNewHandlers) {
        handler(event);
      }
    });

    this.socket.on(MESSAGE_REALTIME_EVENTS.conversationUpdated, (event: ConversationUpdatedEvent) => {
      for (const handler of this.conversationUpdatedHandlers) {
        handler(event);
      }
    });

    this.socket.on("connect", () => {
      const { notifyReconnect, nextHasConnectedOnce } = resolveSocketConnectNotification(
        this.hasConnectedOnce,
      );
      this.hasConnectedOnce = nextHasConnectedOnce;

      if (!notifyReconnect) {
        return;
      }

      for (const handler of this.reconnectHandlers) {
        handler();
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionKey = null;
    this.hasConnectedOnce = false;
    this.appStateSubscription = clearAppStateSubscription(this.appStateSubscription);
  }

  private ensureAppStateListener() {
    if (this.appStateSubscription) {
      return;
    }

    this.appStateSubscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      if (nextState !== "active" || USE_MOCK_BACKEND) {
        return;
      }

      const userId = this.connectionKey?.split(":")[0];
      if (!userId) {
        return;
      }

      void this.connectForCurrentSession(userId);
    });
  }
}

export const messagesRealtimeClient = new MessagesRealtimeClient();
