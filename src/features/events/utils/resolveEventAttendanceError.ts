export const EVENT_ATTENDANCE_ERROR_FALLBACK = "Katılım güncellenemedi.";

export function resolveEventAttendanceError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) {
      return message;
    }
  }

  return EVENT_ATTENDANCE_ERROR_FALLBACK;
}
