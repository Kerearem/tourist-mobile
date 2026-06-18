const FLAGCDN_BASE = "https://flagcdn.com/w160";

const SPECIAL_FLAG_URLS: Record<string, string> = {
  "TR-NC":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg/320px-Flag_of_the_Turkish_Republic_of_Northern_Cyprus.svg.png",
};

export const getCountryFlagImageUrl = (code: string): string | null => {
  const normalized = code.trim().toUpperCase();
  if (SPECIAL_FLAG_URLS[normalized]) {
    return SPECIAL_FLAG_URLS[normalized];
  }
  if (normalized.length !== 2) {
    return null;
  }
  return `${FLAGCDN_BASE}/${normalized.toLowerCase()}.png`;
};

export const getCountryFlagEmoji = (code: string): string => {
  const normalized = code.trim().toUpperCase();
  if (normalized === "TR-NC") {
    return "🇹🇷";
  }
  if (normalized.length !== 2) {
    return "🏳";
  }

  return [...normalized]
    .map((char) => String.fromCodePoint(0x1f1e6 - 65 + char.charCodeAt(0)))
    .join("");
};

export const hasCountryFlagImage = (code: string) => Boolean(getCountryFlagImageUrl(code));
