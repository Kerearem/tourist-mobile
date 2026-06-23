export const HELP_CATEGORY_VALUES = [
  "ACCOMMODATION",
  "TRANSPORT",
  "VISA_LEGAL",
  "HEALTH",
  "JOB_CAREER",
  "EDUCATION",
  "BUREAUCRACY_BANKING",
  "DAILY_LIFE",
  "RECOMMENDATION",
  "QA",
  "EMERGENCY",
  "OTHER",
] as const;

export type HelpCategoryValue = (typeof HELP_CATEGORY_VALUES)[number];

export type HelpCategoryOption = {
  value: HelpCategoryValue;
  label: string;
};

export const HELP_CATEGORIES: HelpCategoryOption[] = [
  { value: "ACCOMMODATION", label: "Konaklama" },
  { value: "TRANSPORT", label: "Ulaşım" },
  { value: "VISA_LEGAL", label: "Vize & Resmi İşlemler" },
  { value: "HEALTH", label: "Sağlık" },
  { value: "JOB_CAREER", label: "İş & Kariyer" },
  { value: "EDUCATION", label: "Eğitim" },
  { value: "BUREAUCRACY_BANKING", label: "Bürokrasi & Bankacılık" },
  { value: "DAILY_LIFE", label: "Günlük Yaşam" },
  { value: "RECOMMENDATION", label: "Tavsiye & Öneri" },
  { value: "QA", label: "Soru & Cevap" },
  { value: "EMERGENCY", label: "Acil & Destek" },
  { value: "OTHER", label: "Diğer" },
];

const labelByValue = new Map(HELP_CATEGORIES.map((item) => [item.value, item.label]));

export const getHelpCategoryLabel = (category?: string | null) => {
  if (!category) {
    return "Diğer";
  }
  return labelByValue.get(category as HelpCategoryValue) ?? category;
};

export const HELP_STATUS_LABELS: Record<"open" | "in_progress" | "resolved", string> = {
  open: "Açık",
  in_progress: "Devam Ediyor",
  resolved: "Çözüldü",
};

export type HelpLocationScope = "city" | "country";
export type HelpIdentityScope = "nationality" | "everyone";

export const HELP_LOCATION_SCOPE_OPTIONS: Array<{ value: HelpLocationScope; label: string }> = [
  { value: "city", label: "Şehrim" },
  { value: "country", label: "Ülkem" },
];

export const HELP_IDENTITY_SCOPE_OPTIONS: Array<{ value: HelpIdentityScope; label: string }> = [
  { value: "nationality", label: "Vatandaşlarım" },
  { value: "everyone", label: "Herkes" },
];

export const DEFAULT_HELP_LOCATION_SCOPE: HelpLocationScope = "city";
export const DEFAULT_HELP_IDENTITY_SCOPE: HelpIdentityScope = "everyone";

export const getHelpFilterSummary = (
  locationScope: HelpLocationScope,
  identityScope: HelpIdentityScope,
): string => {
  const locationLabel =
    HELP_LOCATION_SCOPE_OPTIONS.find((item) => item.value === locationScope)?.label ?? "Şehrim";
  const identityLabel =
    HELP_IDENTITY_SCOPE_OPTIONS.find((item) => item.value === identityScope)?.label ?? "Herkes";
  return `${locationLabel} · ${identityLabel}`;
};
