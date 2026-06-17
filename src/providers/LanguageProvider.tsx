import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getSecureItem, setSecureItem } from "../services/storage/secureStorage";

export type SupportedLanguage = "tr" | "fr" | "en" | "de" | "es" | "it";

type TranslationKey =
  | "auth.login.welcomeBack"
  | "auth.login.identifierPlaceholder"
  | "auth.login.passwordPlaceholder"
  | "auth.login.signIn"
  | "auth.login.createAccount";

type LanguageContextValue = {
  language: SupportedLanguage;
  setLanguage: (nextLanguage: SupportedLanguage) => Promise<void>;
  t: (key: TranslationKey) => string;
};

const LANGUAGE_STORAGE_KEY = "tourist.app.language";

const translations: Record<SupportedLanguage, Record<TranslationKey, string>> = {
  tr: {
    "auth.login.welcomeBack": "Hoş geldin!",
    "auth.login.identifierPlaceholder": "E-posta veya kullanıcı adı",
    "auth.login.passwordPlaceholder": "Şifre",
    "auth.login.signIn": "Giriş Yap",
    "auth.login.createAccount": "Hesabın yok mu? Hesap oluştur",
  },
  fr: {
    "auth.login.welcomeBack": "Bienvenue !",
    "auth.login.identifierPlaceholder": "E-mail ou nom d'utilisateur",
    "auth.login.passwordPlaceholder": "Mot de passe",
    "auth.login.signIn": "Se connecter",
    "auth.login.createAccount": "Vous n'avez pas de compte ? Créez-en un",
  },
  en: {
    "auth.login.welcomeBack": "Welcome!",
    "auth.login.identifierPlaceholder": "Email or username",
    "auth.login.passwordPlaceholder": "Password",
    "auth.login.signIn": "Sign In",
    "auth.login.createAccount": "Don't have an account? Create one",
  },
  de: {
    "auth.login.welcomeBack": "Willkommen!",
    "auth.login.identifierPlaceholder": "E-Mail oder Benutzername",
    "auth.login.passwordPlaceholder": "Passwort",
    "auth.login.signIn": "Anmelden",
    "auth.login.createAccount": "Noch kein Konto? Jetzt erstellen",
  },
  es: {
    "auth.login.welcomeBack": "¡Bienvenido!",
    "auth.login.identifierPlaceholder": "Correo o nombre de usuario",
    "auth.login.passwordPlaceholder": "Contraseña",
    "auth.login.signIn": "Iniciar sesión",
    "auth.login.createAccount": "¿No tienes cuenta? Crea una",
  },
  it: {
    "auth.login.welcomeBack": "Bentornato",
    "auth.login.identifierPlaceholder": "Email o nome utente",
    "auth.login.passwordPlaceholder": "Password",
    "auth.login.signIn": "Accedi",
    "auth.login.createAccount": "Non hai un account? Creane uno",
  },
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("tr");

  useEffect(() => {
    const hydrateLanguage = async () => {
      const stored = await getSecureItem(LANGUAGE_STORAGE_KEY);
      if (!stored) {
        return;
      }
      if (stored === "tr" || stored === "fr" || stored === "en" || stored === "de" || stored === "es" || stored === "it") {
        setLanguageState(stored);
      }
    };
    void hydrateLanguage();
  }, []);

  const setLanguage = async (nextLanguage: SupportedLanguage) => {
    setLanguageState(nextLanguage);
    await setSecureItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  };

  const t = (key: TranslationKey) => translations[language][key] ?? translations.en[key];

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguageContext(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguageContext must be used inside LanguageProvider.");
  }
  return context;
}
