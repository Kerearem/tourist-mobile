export type SupportTopic =
  | "login_access"
  | "messages"
  | "events"
  | "help_requests"
  | "other";

export const SUPPORT_TOPIC_OPTIONS: Array<{ value: SupportTopic; label: string }> = [
  { value: "login_access", label: "Giriş ve hesap erişimi" },
  { value: "messages", label: "Mesajlar" },
  { value: "events", label: "Etkinlik katılımı" },
  { value: "help_requests", label: "Yardım istekleri" },
  { value: "other", label: "Diğer" },
];

export const SUPPORT_TOPIC_LABELS: Record<SupportTopic, string> = {
  login_access: "Giriş ve hesap erişimi",
  messages: "Mesajlar",
  events: "Etkinlik katılımı",
  help_requests: "Yardım istekleri",
  other: "Diğer",
};
