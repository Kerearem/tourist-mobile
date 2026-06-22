export const EVENT_TYPES = [
  { value: "social", label: "Sosyal", emoji: "🎉" },
  { value: "networking", label: "Networking", emoji: "🤝" },
  { value: "food", label: "Yemek", emoji: "🍽" },
  { value: "outdoor", label: "Açık Hava", emoji: "🌿" },
  { value: "culture", label: "Kültür", emoji: "🎭" },
  { value: "sports", label: "Spor", emoji: "⚽" },
  { value: "workshop", label: "Workshop & Eğitim", emoji: "📚" },
  { value: "nightlife", label: "Gece Hayatı", emoji: "🌙" },
  { value: "language", label: "Dil Değişimi", emoji: "🗣" },
  { value: "newcomer", label: "Yeni Gelenler", emoji: "✈️" },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]["value"];

export const EVENT_TYPE_VALUES = EVENT_TYPES.map((item) => item.value);

export const getEventTypeLabel = (value: string) =>
  EVENT_TYPES.find((item) => item.value === value)?.label ?? "Sosyal";

export const getEventTypeEmoji = (value: string) =>
  EVENT_TYPES.find((item) => item.value === value)?.emoji ?? "🎉";
