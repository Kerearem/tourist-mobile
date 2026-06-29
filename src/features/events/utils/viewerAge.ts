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

export const canUseAlcoholAndSmokingFilters = (birthDate?: string | null) => {
  if (!birthDate) {
    return false;
  }
  const age = calculateAgeFromBirthDate(birthDate);
  return age != null && age >= 18;
};
