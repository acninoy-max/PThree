"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/app/i18n/client";
import {
  jahre,
  setzeDatum,
  tageImMonat,
  zerlegeDatum,
  type DatumTeile,
} from "./datum-teile";

/**
 * Geburtsdatum als Tag / Monat / Jahr — warum, steht in datum-teile.ts.
 *
 * Zwei Arten der Nutzung:
 * - In einem `<form action>` mit `name`: Ein verstecktes Feld trägt
 *   "JJJJ-MM-TT" oder "". Ist das Datum halb ausgefüllt, sperrt
 *   `setCustomValidity` das Absenden — sonst käme "" an und der Server
 *   würde ein vorhandenes Datum still löschen (Regel 3).
 * - Gesteuert mit `onChange`: bekommt "JJJJ-MM-TT", "" oder null
 *   (unvollständig). Der Aufrufer sperrt dann selbst das Speichern.
 */
export function BirthDateField({
  name,
  defaultValue,
  onChange,
}: {
  name?: string;
  defaultValue?: string | null;
  onChange?: (iso: string | null) => void;
}) {
  const t = useT();
  const c = t.common;
  const [teile, setTeile] = useState<DatumTeile>(() => zerlegeDatum(defaultValue));
  const tagFeld = useRef<HTMLSelectElement>(null);

  const wert = setzeDatum(teile);

  useEffect(() => {
    tagFeld.current?.setCustomValidity(wert === null ? c.dateIncomplete : "");
  }, [wert, c.dateIncomplete]);

  function setze(neu: Partial<DatumTeile>) {
    const naechste = { ...teile, ...neu };
    setTeile(naechste);
    onChange?.(setzeDatum(naechste));
  }

  // Das laufende Jahr reicht als Obergrenze; ein Geburtsdatum in der
  // Zukunft lehnt die Datenbank ohnehin ab (birth_date_plausibel).
  const bisJahr = new Date().getFullYear();
  const maxTag =
    teile.monat && teile.jahr
      ? tageImMonat(Number(teile.jahr), Number(teile.monat))
      : 31;

  return (
    <span className="pt-datumteile">
      <select
        ref={tagFeld}
        aria-label={c.day}
        value={teile.tag}
        onChange={(e) => setze({ tag: e.target.value })}
      >
        <option value="">{c.day}</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={String(d)} disabled={d > maxTag}>
            {d}
          </option>
        ))}
      </select>
      <select
        aria-label={c.month}
        value={teile.monat}
        onChange={(e) => setze({ monat: e.target.value })}
      >
        <option value="">{c.month}</option>
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i} value={String(i + 1)}>
            {t.fmt.monthLongAt(i)}
          </option>
        ))}
      </select>
      <select
        aria-label={c.year}
        value={teile.jahr}
        onChange={(e) => setze({ jahr: e.target.value })}
      >
        <option value="">{c.year}</option>
        {jahre(bisJahr).map((j) => (
          <option key={j} value={String(j)}>
            {j}
          </option>
        ))}
      </select>
      {name && <input type="hidden" name={name} value={wert ?? ""} />}
      {wert === null && <span className="pt-datumteile-hinweis">{c.dateIncomplete}</span>}
    </span>
  );
}
