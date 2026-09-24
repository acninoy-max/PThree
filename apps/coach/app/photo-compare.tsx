"use client";

import { useMemo, useState } from "react";
import type { ProgressPhoto } from "@ptfive/db";
import { deltaLabel } from "@ptfive/coach-engine";
import { dateMedium } from "@/app/format";
import {
  availablePoses,
  buildComparison,
  byPose,
  defaultComparison,
  poseLabel,
  type Pose,
  type WeightPoint,
} from "@/app/athlete/photos/compare";

/**
 * Vorher — Nachher, nur zum Ansehen.
 *
 * Eine Komponente für drei Stellen: Klientenakte des Trainers,
 * Fotoseite des Athleten, und seit heute auch seine Fortschrittsseite.
 * Vorher stand dieselbe Logik zweimal im Code, und beim dritten Mal
 * hätte sie dreimal dagestanden — spätestens dann laufen die Fassungen
 * auseinander und zeigen zu denselben Bildern verschiedene Spannen.
 *
 * Bewusst OHNE Hochladen, Löschen und Widerruf. Das sind Eingriffe, und
 * die gehören auf die Fotoseite, wo man sie erwartet. Hier wird nur
 * geschaut.
 */
export function PhotoCompare({
  photos,
  weights,
  /** Größer zeigen, wenn die Komponente eine ganze Seite trägt. */
  gross = false,
}: {
  photos: ProgressPhoto[];
  weights: WeightPoint[];
  gross?: boolean;
}) {
  const vorhandene = useMemo(() => availablePoses(photos), [photos]);
  const [pose, setPose] = useState<Pose | null>(null);
  const aktive = pose ?? vorhandene[0] ?? null;

  const reihe = useMemo(
    () => (aktive ? byPose(photos, aktive) : []),
    [photos, aktive],
  );
  const [linksId, setLinksId] = useState<string | null>(null);
  const [rechtsId, setRechtsId] = useState<string | null>(null);

  const vergleich = useMemo(() => {
    if (!aktive) return null;
    const links = reihe.find((p) => p.id === linksId);
    const rechts = reihe.find((p) => p.id === rechtsId);
    if (links && rechts) return buildComparison(links, rechts, weights);
    return defaultComparison(photos, aktive, weights);
  }, [photos, reihe, aktive, linksId, rechtsId, weights]);

  if (!vergleich) {
    return (
      <p
        style={{
          margin: 0,
          fontSize: "var(--pt-fs-base)",
          color: "var(--g-dim, var(--pt-text-dim))",
          lineHeight: 1.5,
        }}
      >
        {photos.length === 0
          ? "Noch kein Bild."
          : "Erst ein Bild in dieser Ansicht — ein Vergleich braucht zwei."}
      </p>
    );
  }

  return (
    <>
      {/* Der Umschalter erscheint nur, wenn es etwas umzuschalten gibt.
          Ein einzelner Knopf, der nichts ändert, ist Ballast. */}
      {vorhandene.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {vorhandene.map((p) => (
            <button
              key={p}
              type="button"
              className="mc-range"
              data-active={aktive === p}
              aria-pressed={aktive === p}
              onClick={() => {
                setPose(p);
                setLinksId(null);
                setRechtsId(null);
              }}
            >
              {poseLabel(p)}
            </button>
          ))}
        </div>
      )}

      <div className="cmp">
        <Seite
          photo={vergleich.before}
          label="Vorher"
          auswahl={reihe}
          onPick={setLinksId}
        />
        <Seite
          photo={vergleich.after}
          label="Nachher"
          auswahl={reihe}
          onPick={setRechtsId}
        />
      </div>

      {/* Die Bilanz unter den Bildern. Die Spanne steht immer, die
          Gewichtsdifferenz nur, wenn auf BEIDEN Seiten ein Check-in in
          der Nähe liegt — eine Differenz gegen eine fehlende Zahl wäre
          erfunden. */}
      <p
        style={{
          margin: "12px 0 0",
          textAlign: "center",
          fontVariantNumeric: "tabular-nums",
          fontSize: gross ? "var(--pt-fs-lg)" : "var(--pt-fs-base)",
        }}
      >
        <strong>{vergleich.span}</strong>
        {vergleich.weightDelta !== null && (
          <>
            {" · "}
            <strong>{deltaLabel(vergleich.weightDelta, "kg")}</strong>
          </>
        )}
      </p>
    </>
  );
}

/** Eine Hälfte des Vergleichs, mit Auswahl darunter. */
function Seite({
  photo,
  label,
  auswahl,
  onPick,
}: {
  photo: ProgressPhoto;
  label: string;
  auswahl: ProgressPhoto[];
  onPick: (id: string) => void;
}) {
  return (
    <div>
      <p className="cmp__label">{label}</p>
      <div className="cmp__bild">
        {photo.url ? (
          // Kein next/image: Die Adressen sind signiert und laufen nach
          // einer Stunde ab — der Bildoptimierer würde sie
          // zwischenspeichern und danach ins Leere greifen.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt={`${label}, ${photo.takenOn}`} />
        ) : (
          <div className="cmp__fehlt">nicht ladbar</div>
        )}
      </div>
      {/* Ab drei Aufnahmen darf man wählen; darunter gibt es nichts zu
          wählen, und ein Auswahlfeld mit zwei Einträgen ist eine
          Bedienung, die keine ist. */}
      {auswahl.length > 2 ? (
        <select
          value={photo.id}
          onChange={(e) => onPick(e.target.value)}
          aria-label={`${label}: Aufnahme wählen`}
          style={{ marginTop: 6, fontSize: "var(--pt-fs-base)" }}
        >
          {auswahl.map((p) => (
            <option key={p.id} value={p.id}>
              {dateMedium(new Date(p.takenOn))}
            </option>
          ))}
        </select>
      ) : (
        <p className="cmp__datum">{dateMedium(new Date(photo.takenOn))}</p>
      )}
    </div>
  );
}
