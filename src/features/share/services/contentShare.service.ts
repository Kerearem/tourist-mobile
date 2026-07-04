import { Share } from "react-native";

import { getMyFriends } from "../../profile/services/follow.service";
import {
  getConversations,
  getOrCreateDirectConversation,
  sendMessage,
} from "../../messages/services/messages.service";
import type { ContentSharePayload, ShareFriendTarget } from "../types/contentShare";
import { buildContentShareMessage } from "../utils/buildContentShareMessage";

export async function shareContentSystem(payload: ContentSharePayload): Promise<void> {
  const message = buildContentShareMessage(payload);

  try {
    await Share.share({
      message,
      ...(payload.previewUrl ? { url: payload.previewUrl } : {}),
    });
  } catch {
    // User dismissed share sheet.
  }
}

export async function loadShareFriendTargets(viewerId: string): Promise<ShareFriendTarget[]> {
  const [conversations, friends] = await Promise.all([getConversations(), getMyFriends()]);

  const targets = new Map<string, ShareFriendTarget>();

  conversations
    .filter((thread) => thread.type === "direct")
    .forEach((thread) => {
      const other = thread.participants.find((participant) => participant.id !== viewerId);
      if (!other) {
        return;
      }
      targets.set(other.id, {
        id: other.id,
        displayName: other.displayName,
        avatarUrl: other.avatarUrl,
        threadId: thread.id,
      });
    });

  friends.forEach((friend) => {
    if (targets.has(friend.user.id)) {
      return;
    }
    targets.set(friend.user.id, {
      id: friend.user.id,
      displayName: friend.user.displayName,
      username: friend.user.username,
      avatarUrl: friend.user.avatarUrl,
    });
  });

  return [...targets.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, "tr"));
}

export async function sendContentToFriend({
  viewer,
  target,
  payload,
}: {
  viewer: { id: string; displayName: string };
  target: ShareFriendTarget;
  payload: ContentSharePayload;
}): Promise<string> {
  const threadId =
    target.threadId ??
    (
      await getOrCreateDirectConversation({
        viewer,
        target: {
          id: target.id,
          displayName: target.displayName,
          avatarUrl: target.avatarUrl,
        },
      })
    ).id;

  await sendMessage({
    threadId,
    sender: viewer,
    text: buildContentShareMessage(payload),
  });

  return threadId;
}
