"use client";

import { useState } from "react";
import { useT } from "@/app/i18n/client";
import { entwurfUmfang, type TrainingsEntwurf } from "./training-entwurf";
import { tagISO } from "@/app/zone";

/**
 * Rückfrage „weitermachen oder verwerfen" — für Athlet (gym-*) und
 * Trainer (pt-*), weil beide denselben Entwurf haben.
 *
 * Verwerfen braucht zwei Tipps: Es löscht Sätze, die nirgends sonst
 * stehen, und der Knopf liegt direkt unter „Weitermachen".
 */
export function EntwurfKarte({
  entwurf,
  variante,
  onWeiter,
  onVerwerfen,
}: {
  entwurf: TrainingsEntwurf;
  variante: "gym" | "pt";
  onWeiter: () => void;
  onVerwerfen: () => void;
}) {
  const t = useT();
  const D = t.draft;
  const [sicher, setSicher] = useState(false);
  const { uebungen, saetze } = entwurfUmfang(entwurf);

  const begonnen = new Date(entwurf.begonnenAm);
  const heute = tagISO(begonnen) === tagISO(new Date());
  const wann = heute ? t.fmt.time(begonnen) : t.fmt.weekdayTime(begonnen);

  return (
    <div
      className={`${variante}-card`}
      role="alertdialog"
      aria-label={D.title}
      style={{ display: "grid", gap: 12, marginBottom: 16 }}
    >
      <div>
        <p style={{ margin: 0, fontSize: "var(--pt-fs-xl)", fontWeight: 700 }}>{D.title}</p>
        <p style={{ margin: "4px 0 0", fontSize: "var(--pt-fs-md)", lineHeight: 1.5 }}>
          {D.body(entwurf.dayTitle, wann, uebungen, saetze)}
        </p>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        <button type="button" className={`${variante}-btn`} onClick={onWeiter}>
          {D.continue}
        </button>
        <button
          type="button"
          className={`${variante}-btn ${variante}-btn--ghost`}
          onClick={() => (sicher ? onVerwerfen() : setSicher(true))}
        >
          {sicher ? D.discardSure : D.discard}
        </button>
      </div>
    </div>
  );
}
