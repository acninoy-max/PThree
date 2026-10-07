"use client";

/**
 * Sprache und Texte in Client-Komponenten.
 *
 * Der Server entscheidet die Sprache und reicht nur den Code ("en"/"de")
 * herunter — das Wörterbuch enthält Funktionen und ließe sich nicht als
 * Prop übertragen. Würde der Browser selbst entscheiden (etwa aus
 * `navigator.language`), könnte er anders entscheiden als der Server,
 * und jede Seite hätte einen Hydration-Fehler.
 */
import { createContext, useContext } from "react";
import { dictFor, type Dict } from "./index";
import { DEFAULT_LOCALE, type Locale } from "./locale";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): Dict {
  return dictFor(useContext(LocaleContext));
}
