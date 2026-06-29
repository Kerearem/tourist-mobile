export const formatBirthDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseBirthDate = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    return null;
  }
  return date;
};

export const getDefaultBirthDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 20);
  date.setHours(12, 0, 0, 0);
  return date;
};

export const getMinimumBirthDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 100);
  date.setHours(12, 0, 0, 0);
  return date;
};

export const getMaximumBirthDate = () => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date;
};

export const formatBirthDateLabel = (value?: string | null): string => {
  if (!value?.trim()) {
    return "Belirtilmemiş";
  }

  const parsed = parseBirthDate(value.trim());
  if (!parsed) {
    return "Belirtilmemiş";
  }

  return parsed.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
