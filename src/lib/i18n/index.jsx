"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import en from "./en";
import ar from "./ar";

const dictionaries = { en, ar };

const I18nContext = createContext({
  locale: "ar",
  dir: "rtl",
  t: ar,
  setLocale: () => {},
});

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState("ar");

  useEffect(() => {
    const saved = localStorage.getItem("admin-locale");
    if (saved && (saved === "en" || saved === "ar")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((newLocale) => {
    setLocaleState(newLocale);
    localStorage.setItem("admin-locale", newLocale);
  }, []);

  const dir = locale === "ar" ? "rtl" : "ltr";
  const t = dictionaries[locale];

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = locale;
  }, [dir, locale]);

  return (
    <I18nContext.Provider value={{ locale, dir, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
