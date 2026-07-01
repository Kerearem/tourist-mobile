import { getCountryByCode, getCountryLabel } from "../constants/countries";

export function formatProfileLocation(
  city?: string | null,
  countryCode?: string | null,
  locale: "tr" | "en" = "tr",
): string | null {
  const trimmedCity = city?.trim();
  const code = countryCode?.trim().toUpperCase();
  const country = code ? getCountryByCode(code) : null;
  const countryName = country ? getCountryLabel(country, locale) : code || null;

  if (trimmedCity && countryName) {
    return `${trimmedCity}, ${countryName}`;
  }
  if (trimmedCity) {
    return trimmedCity;
  }
  if (countryName) {
    return countryName;
  }
  return null;
}
