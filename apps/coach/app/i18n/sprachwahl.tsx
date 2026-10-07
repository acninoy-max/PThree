"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocaleAction } from "./actions";
import { useLocale, useT } from "./client";
import { LOCALES } from "./locale";

/**
 * Umschalter zwischen den Sprachen.
 *
 * Jede Sprache steht in ihrer eigenen Schreibweise („Deutsch", nicht
 * „German") — wer die aktuelle Sprache nicht liest, muss seine eigene
 * trotzdem finden.
 */
export function Sprachwahl({ kurz = false }: { kurz?: boolean }) {
  const t = useT();
  const aktiv = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div
      role="group"
      aria-label={t.language.label}
      className="pt-langswitch"
      data-kurz={kurz}
      data-pending={pending}
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          className="pt-toggle"
          data-active={l === aktiv}
          aria-pressed={l === aktiv}
          disabled={pending}
          lang={l}
          title={t.language[l]}
          onClick={() =>
            start(async () => {
              await setLocaleAction(l);
              // Server-Komponenten neu rendern; der Provider bekommt die
              // neue Sprache von oben. Kein Neuladen der ganzen Seite.
              router.refresh();
            })
          }
        >
          {/* Kurz für die Kopfzeile, wo neben Name und Abmelden kein
              Platz für zwei ausgeschriebene Sprachen ist. */}
          {kurz ? l.toUpperCase() : t.language[l]}
        </button>
      ))}
    </div>
  );
}
