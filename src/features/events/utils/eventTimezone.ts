import { DateTime } from "luxon";
import { getTimeZones } from "@vvo/tzdb";

export type WallClockDateTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export type WallClockConversionResult =
  | { ok: true; utcMillis: number; iso: string }
  | { ok: false; reason: "invalid" | "ambiguous" };

export type TimezoneOption = {
  value: string;
  label: string;
  searchText: string;
};

export const EVENT_TIMEZONE_INVALID_MESSAGE = "Geçerli bir etkinlik saat dilimi seçmelisin.";
export const EVENT_DST_INVALID_WALL_CLOCK_MESSAGE =
  "Seçtiğin saat bu saat diliminde yaz saati geçişi nedeniyle geçerli değil.";
export const EVENT_DST_AMBIGUOUS_WALL_CLOCK_MESSAGE =
  "Seçtiğin saat bu saat diliminde belirsiz. Lütfen başka bir saat seç.";

const TZDB_BY_NAME = new Map(
  getTimeZones().flatMap((zone) => zone.group.map((name) => [name, zone] as const)),
);

export function resolveIntlDeviceTimezone(): string | undefined {
  try {
    const intlTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
    const canonical = intlTimezone ? normalizeIanaTimezone(intlTimezone) : null;
    return canonical ?? undefined;
  } catch {
    return undefined;
  }
}

export function isValidIanaTimezone(timezone: string | null | undefined): boolean {
  const candidate = timezone?.trim();
  if (!candidate) {
    return false;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: candidate });
    return true;
  } catch {
    return false;
  }
}

export function canonicalizeIanaTimezone(timezone: string): string | null {
  if (!isValidIanaTimezone(timezone)) {
    return null;
  }

  try {
    const canonical = Intl.DateTimeFormat(undefined, { timeZone: timezone })
      .resolvedOptions()
      .timeZone?.trim();

    if (!canonical || !isValidIanaTimezone(canonical)) {
      return null;
    }

    return canonical;
  } catch {
    return null;
  }
}

export function normalizeIanaTimezone(timezone: string | null | undefined): string | null {
  const candidate = timezone?.trim();
  if (!candidate) {
    return null;
  }

  return canonicalizeIanaTimezone(candidate);
}

export function listIanaTimeZoneIds(): string[] {
  if (typeof Intl !== "undefined" && "supportedValuesOf" in Intl) {
    return Intl.supportedValuesOf("timeZone").slice().sort();
  }

  const ids = new Set<string>();
  for (const zone of getTimeZones()) {
    ids.add(zone.name);
    for (const alias of zone.group) {
      ids.add(alias);
    }
  }

  return [...ids].sort();
}

export function formatTimezoneOptionLabel(timezone: string): string {
  const metadata = TZDB_BY_NAME.get(timezone);
  if (!metadata) {
    return timezone;
  }

  const cityHint = metadata.mainCities[0];
  return cityHint ? `${timezone} · ${cityHint}` : timezone;
}

export function buildTimezoneOptions(): TimezoneOption[] {
  return listIanaTimeZoneIds().map((value) => {
    const metadata = TZDB_BY_NAME.get(value);
    const searchParts = [
      value,
      metadata?.alternativeName ?? "",
      ...(metadata?.mainCities ?? []),
      metadata?.countryName ?? "",
    ];

    return {
      value,
      label: formatTimezoneOptionLabel(value),
      searchText: searchParts.join(" ").toLowerCase(),
    };
  });
}

export function searchTimezoneOptions(options: TimezoneOption[], query: string): TimezoneOption[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return options;
  }

  return options.filter((option) => option.searchText.includes(normalized) || option.value.toLowerCase().includes(normalized));
}

export function wallClockFromDate(date: Date): WallClockDateTime {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

export function dateFromWallClock(wall: WallClockDateTime): Date {
  return new Date(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, 0, 0);
}

export function getNowWallClockInTimezone(timezone: string, now = DateTime.utc()): WallClockDateTime | null {
  if (!isValidIanaTimezone(timezone)) {
    return null;
  }

  const localized = now.setZone(timezone);
  return {
    year: localized.year,
    month: localized.month,
    day: localized.day,
    hour: localized.hour,
    minute: localized.minute,
  };
}

export function matchesWallClockFields(dateTime: DateTime, wall: WallClockDateTime): boolean {
  return (
    dateTime.year === wall.year &&
    dateTime.month === wall.month &&
    dateTime.day === wall.day &&
    dateTime.hour === wall.hour &&
    dateTime.minute === wall.minute
  );
}

export function collectWallClockUtcCandidates(
  wall: WallClockDateTime,
  timezone: string,
): DateTime[] {
  const candidate = DateTime.fromObject(
    {
      year: wall.year,
      month: wall.month,
      day: wall.day,
      hour: wall.hour,
      minute: wall.minute,
      second: 0,
      millisecond: 0,
    },
    { zone: timezone },
  );

  if (!candidate.isValid || !matchesWallClockFields(candidate, wall)) {
    return [];
  }

  const matchingOffsets = candidate
    .getPossibleOffsets()
    .filter((offsetCandidate) => matchesWallClockFields(offsetCandidate, wall));

  const uniqueUtcMillis = new Set<number>();
  const uniqueCandidates: DateTime[] = [];

  for (const offsetCandidate of matchingOffsets) {
    const utcMillis = offsetCandidate.toUTC().toMillis();
    if (uniqueUtcMillis.has(utcMillis)) {
      continue;
    }

    uniqueUtcMillis.add(utcMillis);
    uniqueCandidates.push(offsetCandidate);
  }

  return uniqueCandidates;
}

export function wallClockToUtc(wall: WallClockDateTime, timezone: string): WallClockConversionResult {
  if (!isValidIanaTimezone(timezone)) {
    return { ok: false, reason: "invalid" };
  }

  const candidates = collectWallClockUtcCandidates(wall, timezone);

  if (candidates.length === 0) {
    return { ok: false, reason: "invalid" };
  }

  if (candidates.length > 1) {
    return { ok: false, reason: "ambiguous" };
  }

  const utc = candidates[0]!.toUTC();
  return {
    ok: true,
    utcMillis: utc.toMillis(),
    iso: utc.toISO() ?? "",
  };
}

export function utcIsoToWallClock(iso: string, timezone: string): WallClockDateTime | null {
  if (!isValidIanaTimezone(timezone)) {
    return null;
  }

  const localized = DateTime.fromISO(iso, { zone: "utc" }).setZone(timezone);
  if (!localized.isValid) {
    return null;
  }

  return {
    year: localized.year,
    month: localized.month,
    day: localized.day,
    hour: localized.hour,
    minute: localized.minute,
  };
}

export function formatWallClockInTimezone(
  wall: WallClockDateTime,
  timezone: string,
  locale = "tr-TR",
): string {
  const conversion = wallClockToUtc(wall, timezone);
  if (!conversion.ok) {
    return dateFromWallClock(wall).toLocaleString(locale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return formatUtcIsoInTimezone(conversion.iso, timezone, locale);
}

export function formatUtcIsoInTimezone(
  iso: string,
  timezone: string,
  locale = "tr-TR",
): string {
  if (!isValidIanaTimezone(timezone)) {
    return new Date(iso).toLocaleString(locale, {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const localized = DateTime.fromISO(iso, { zone: "utc" }).setZone(timezone).setLocale(locale);
  if (!localized.isValid) {
    return new Date(iso).toLocaleString(locale);
  }

  const offsetLabel = localized.offsetNameShort || localized.toFormat("ZZ");
  return `${localized.toFormat("d MMMM yyyy HH:mm")} (${offsetLabel})`;
}

export function formatEventDateTimeRange(
  startsAt: string,
  endsAt: string | undefined,
  timezone: string | undefined,
  locale = "tr-TR",
): string {
  const startLabel = formatEventInstant(startsAt, timezone, locale);
  if (!endsAt) {
    return startLabel;
  }

  if (isValidIanaTimezone(timezone)) {
    const end = DateTime.fromISO(endsAt, { zone: "utc" }).setZone(timezone!).setLocale(locale);
    const endLabel = end.isValid ? end.toFormat("HH:mm") : new Date(endsAt).toLocaleTimeString(locale);
    return `${startLabel} - ${endLabel}`;
  }

  const end = new Date(endsAt);
  const endLabel = end.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  return `${startLabel} - ${endLabel}`;
}

export function formatEventInstant(
  iso: string,
  timezone: string | undefined,
  locale = "tr-TR",
): string {
  if (isValidIanaTimezone(timezone)) {
    return formatUtcIsoInTimezone(iso, timezone!, locale);
  }

  return new Date(iso).toLocaleString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatEventDateBadge(
  iso: string,
  timezone: string | undefined,
  locale = "tr-TR",
): { day: string; weekday: string } {
  if (isValidIanaTimezone(timezone)) {
    const localized = DateTime.fromISO(iso, { zone: "utc" }).setZone(timezone!).setLocale(locale);
    if (localized.isValid) {
      return {
        day: localized.toFormat("dd"),
        weekday: localized.toFormat("ccc").toUpperCase(),
      };
    }
  }

  const date = new Date(iso);
  return {
    day: date.toLocaleDateString(locale, { day: "2-digit" }),
    weekday: date.toLocaleDateString(locale, { weekday: "short" }).toUpperCase(),
  };
}

export function formatEventTimeLabel(
  iso: string,
  timezone: string | undefined,
  locale = "tr-TR",
): string {
  if (isValidIanaTimezone(timezone)) {
    const localized = DateTime.fromISO(iso, { zone: "utc" }).setZone(timezone!).setLocale(locale);
    if (localized.isValid) {
      return localized.toFormat("HH:mm");
    }
  }

  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function resolveWallClockValidationError(
  wall: WallClockDateTime,
  timezone: string,
): string | null {
  const conversion = wallClockToUtc(wall, timezone);
  if (conversion.ok) {
    return null;
  }

  if (conversion.reason === "ambiguous") {
    return EVENT_DST_AMBIGUOUS_WALL_CLOCK_MESSAGE;
  }

  return EVENT_DST_INVALID_WALL_CLOCK_MESSAGE;
}
