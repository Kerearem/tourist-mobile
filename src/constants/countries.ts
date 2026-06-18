export type Country = {
  code: string;
  labelTr: string;
  labelEn: string;
  homeCommunity: string;
};

export const COUNTRIES: Country[] = [
  { code: "TR", labelTr: "Türkiye", labelEn: "Turkey", homeCommunity: "Turkish" },
  { code: "DE", labelTr: "Almanya", labelEn: "Germany", homeCommunity: "German" },
  { code: "GB", labelTr: "Birleşik Krallık", labelEn: "United Kingdom", homeCommunity: "British" },
  { code: "US", labelTr: "ABD", labelEn: "United States", homeCommunity: "American" },
  { code: "CA", labelTr: "Kanada", labelEn: "Canada", homeCommunity: "Canadian" },
  { code: "NL", labelTr: "Hollanda", labelEn: "Netherlands", homeCommunity: "Dutch" },
  { code: "FR", labelTr: "Fransa", labelEn: "France", homeCommunity: "French" },
  { code: "IT", labelTr: "İtalya", labelEn: "Italy", homeCommunity: "Italian" },
  { code: "ES", labelTr: "İspanya", labelEn: "Spain", homeCommunity: "Spanish" },
  { code: "AT", labelTr: "Avusturya", labelEn: "Austria", homeCommunity: "Austrian" },
  { code: "BE", labelTr: "Belçika", labelEn: "Belgium", homeCommunity: "Belgian" },
  { code: "CH", labelTr: "İsviçre", labelEn: "Switzerland", homeCommunity: "Swiss" },
  { code: "PL", labelTr: "Polonya", labelEn: "Poland", homeCommunity: "Polish" },
  { code: "CZ", labelTr: "Çekya", labelEn: "Czechia", homeCommunity: "Czech" },
  { code: "AU", labelTr: "Avustralya", labelEn: "Australia", homeCommunity: "Australian" },
  { code: "IE", labelTr: "İrlanda", labelEn: "Ireland", homeCommunity: "Irish" },
  { code: "AE", labelTr: "BAE", labelEn: "United Arab Emirates", homeCommunity: "Emirati" },
  { code: "JP", labelTr: "Japonya", labelEn: "Japan", homeCommunity: "Japanese" },
  { code: "KR", labelTr: "Güney Kore", labelEn: "South Korea", homeCommunity: "Korean" },
  { code: "CY", labelTr: "Kıbrıs", labelEn: "Cyprus", homeCommunity: "Cypriot" },
  { code: "TR-NC", labelTr: "Kuzey Kıbrıs", labelEn: "Northern Cyprus", homeCommunity: "Turkish Cypriot" },
  { code: "GR", labelTr: "Yunanistan", labelEn: "Greece", homeCommunity: "Greek" },
  { code: "BG", labelTr: "Bulgaristan", labelEn: "Bulgaria", homeCommunity: "Bulgarian" },
  { code: "RO", labelTr: "Romanya", labelEn: "Romania", homeCommunity: "Romanian" },
  { code: "RU", labelTr: "Rusya", labelEn: "Russia", homeCommunity: "Russian" },
  { code: "UA", labelTr: "Ukrayna", labelEn: "Ukraine", homeCommunity: "Ukrainian" },
  { code: "CN", labelTr: "Çin", labelEn: "China", homeCommunity: "Chinese" },
  { code: "IN", labelTr: "Hindistan", labelEn: "India", homeCommunity: "Indian" },
  { code: "AL", labelTr: "Arnavutluk", labelEn: "Albania", homeCommunity: "Albanian" },
  { code: "AD", labelTr: "Andorra", labelEn: "Andorra", homeCommunity: "Andorran" },
  { code: "AM", labelTr: "Ermenistan", labelEn: "Armenia", homeCommunity: "Armenian" },
  { code: "AZ", labelTr: "Azerbaycan", labelEn: "Azerbaijan", homeCommunity: "Azerbaijani" },
  { code: "BY", labelTr: "Belarus", labelEn: "Belarus", homeCommunity: "Belarusian" },
  { code: "BA", labelTr: "Bosna-Hersek", labelEn: "Bosnia and Herzegovina", homeCommunity: "Bosnian" },
  { code: "HR", labelTr: "Hırvatistan", labelEn: "Croatia", homeCommunity: "Croatian" },
  { code: "DK", labelTr: "Danimarka", labelEn: "Denmark", homeCommunity: "Danish" },
  { code: "EE", labelTr: "Estonya", labelEn: "Estonia", homeCommunity: "Estonian" },
  { code: "FI", labelTr: "Finlandiya", labelEn: "Finland", homeCommunity: "Finnish" },
  { code: "GE", labelTr: "Gürcistan", labelEn: "Georgia", homeCommunity: "Georgian" },
  { code: "HU", labelTr: "Macaristan", labelEn: "Hungary", homeCommunity: "Hungarian" },
  { code: "IS", labelTr: "İzlanda", labelEn: "Iceland", homeCommunity: "Icelandic" },
  { code: "XK", labelTr: "Kosova", labelEn: "Kosovo", homeCommunity: "Kosovar" },
  { code: "LV", labelTr: "Letonya", labelEn: "Latvia", homeCommunity: "Latvian" },
  { code: "LI", labelTr: "Lihtenştayn", labelEn: "Liechtenstein", homeCommunity: "Liechtensteiner" },
  { code: "LT", labelTr: "Litvanya", labelEn: "Lithuania", homeCommunity: "Lithuanian" },
  { code: "LU", labelTr: "Lüksemburg", labelEn: "Luxembourg", homeCommunity: "Luxembourgish" },
  { code: "MT", labelTr: "Malta", labelEn: "Malta", homeCommunity: "Maltese" },
  { code: "MD", labelTr: "Moldova", labelEn: "Moldova", homeCommunity: "Moldovan" },
  { code: "MC", labelTr: "Monako", labelEn: "Monaco", homeCommunity: "Monegasque" },
  { code: "ME", labelTr: "Karadağ", labelEn: "Montenegro", homeCommunity: "Montenegrin" },
  { code: "MK", labelTr: "Kuzey Makedonya", labelEn: "North Macedonia", homeCommunity: "Macedonian" },
  { code: "NO", labelTr: "Norveç", labelEn: "Norway", homeCommunity: "Norwegian" },
  { code: "PT", labelTr: "Portekiz", labelEn: "Portugal", homeCommunity: "Portuguese" },
  { code: "SM", labelTr: "San Marino", labelEn: "San Marino", homeCommunity: "Sammarinese" },
  { code: "RS", labelTr: "Sırbistan", labelEn: "Serbia", homeCommunity: "Serbian" },
  { code: "SK", labelTr: "Slovakya", labelEn: "Slovakia", homeCommunity: "Slovak" },
  { code: "SI", labelTr: "Slovenya", labelEn: "Slovenia", homeCommunity: "Slovenian" },
  { code: "SE", labelTr: "İsveç", labelEn: "Sweden", homeCommunity: "Swedish" },
  { code: "VA", labelTr: "Vatikan", labelEn: "Vatican City", homeCommunity: "Vatican" },
];

const countryByCode = new Map(COUNTRIES.map((country) => [country.code, country]));

export const getCountryByCode = (code: string) => countryByCode.get(code.trim().toUpperCase()) ?? null;

export const getCountryLabel = (country: Country, locale: "tr" | "en") =>
  locale === "en" ? country.labelEn : country.labelTr;

export const filterCountries = (query: string, locale: "tr" | "en") => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return COUNTRIES;
  }

  return COUNTRIES.filter((country) => {
    const label = getCountryLabel(country, locale).toLowerCase();
    const altLabel = getCountryLabel(country, locale === "en" ? "tr" : "en").toLowerCase();
    return (
      label.includes(normalized) ||
      altLabel.includes(normalized) ||
      country.code.toLowerCase().includes(normalized)
    );
  });
};
