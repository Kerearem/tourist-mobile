import { getCalendars } from "expo-localization";

import { normalizeIanaTimezone, resolveIntlDeviceTimezone } from "./eventTimezone";

export function resolveDeviceTimezone(): string | undefined {
  try {
    const calendarTimezone = getCalendars()[0]?.timeZone?.trim();
    const canonical = calendarTimezone ? normalizeIanaTimezone(calendarTimezone) : null;
    if (canonical) {
      return canonical;
    }
  } catch {
    // Fall through to Intl.
  }

  return resolveIntlDeviceTimezone();
}
