import type { ContentSharePayload, ShareContentType } from "../types/contentShare";

const CONTENT_LABELS: Record<ShareContentType, string> = {
  snap: "Snap",
  reel: "Tanıtım",
  moment: "An",
};

export function buildContentShareMessage(payload: ContentSharePayload): string {
  const label = CONTENT_LABELS[payload.type];
  const caption = payload.caption?.trim();
  const lines = [
    `Tourist — ${payload.authorDisplayName} bir ${label} paylaştı`,
    ...(caption ? [`"${caption}"`] : []),
    `[${payload.type}:${payload.contentId}]`,
  ];
  return lines.join("\n");
}
