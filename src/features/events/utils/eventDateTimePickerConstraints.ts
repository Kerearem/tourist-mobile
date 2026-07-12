export const isSameCalendarDay = (year: number, month: number, day: number, reference: Date) =>
  year === reference.getFullYear() &&
  month === reference.getMonth() + 1 &&
  day === reference.getDate();

export function buildHourValues(
  year: number,
  month: number,
  day: number,
  minimumDate: Date,
): number[] {
  let start = 0;
  if (isSameCalendarDay(year, month, day, minimumDate)) {
    start = minimumDate.getHours();
  }
  return Array.from({ length: 24 - start }, (_, index) => start + index);
}

export function buildMinuteValues(
  year: number,
  month: number,
  day: number,
  hour: number,
  minimumDate: Date,
): number[] {
  let start = 0;
  if (isSameCalendarDay(year, month, day, minimumDate) && hour === minimumDate.getHours()) {
    start = minimumDate.getMinutes();
  }
  return Array.from({ length: 60 - start }, (_, index) => start + index);
}
