export const isValidUsername = (value: string) => {
  if (!/^[a-z0-9._]{3,24}$/.test(value)) {
    return false;
  }
  if (value.startsWith(".") || value.endsWith(".") || value.includes("..")) {
    return false;
  }
  return true;
};

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isValidBirthDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
};

export const isValidCountryCode = (value: string) => /^\+\d{1,4}$/.test(value);

export const isValidPhoneNumber = (value: string) => /^\d{7,15}$/.test(value);

export const isValidPassword = (value: string) => value.length >= 6;
