export const calculateAgeFromBirthDate = (
  birthDate: string,
  referenceDate: Date = new Date(),
): number | null => {
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  let age = referenceDate.getFullYear() - parsed.getFullYear();
  const monthDiff = referenceDate.getMonth() - parsed.getMonth();
  const dayDiff = referenceDate.getDate() - parsed.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
};

export const MIN_ORGANIZER_AGE = 18;

export const meetsOrganizerMinimumAge = (birthDate?: string | null) => {
  if (!birthDate) {
    return false;
  }
  const age = calculateAgeFromBirthDate(birthDate);
  return age != null && age >= MIN_ORGANIZER_AGE;
};

export const isEventMinAgeAllowedForOrganizer = (
  organizerAge: number | null,
  minAge: null | 18 | 21,
) => {
  if (minAge == null) {
    return true;
  }
  if (organizerAge == null) {
    return false;
  }
  return minAge <= organizerAge;
};

export const canUseAlcoholAndSmokingFilters = (birthDate?: string | null) => {
  if (!birthDate) {
    return false;
  }
  const age = calculateAgeFromBirthDate(birthDate);
  return age != null && age >= 18;
};
