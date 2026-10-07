"use client";

import { useEffect } from "react";
import { IconCheck, IconChevronRight, IconX } from "@/app/icons";
import { useT } from "@/app/i18n/client";

export type FieldKind = "weight" | "reps" | "rir";

/**
 * Eigener Ziffernblock statt Systemtastatur.
 *
 * Der Grund ist nicht Optik: Die iOS-Zahlentastatur hat kleine Tasten und
 * keinen Weiter-Knopf, der durch die Felder springt. Im Studio, mit
 * feuchten Händen und 60 Sekunden Satzpause, entscheidet genau das darüber,
 * ob geloggt wird oder nicht.
 *
 * Tasten sind 60 px hoch — deutlich über Apples Richtwert von 44 px.
 */
export function Numpad({
  kind,
  addedWeight = false,
  value,
  title,
  isLast,
  onChange,
  onNext,
  onClose,
}: {
  kind: FieldKind;
  /**
   * Zusatzgewicht statt Gesamtlast — bei Körpergewichtsübungen mit
   * bekanntem Körperanteil. Der Athlet soll nicht raten, was ins Feld
   * gehört; steht hier „Last", trägt er irgendwann sein Körpergewicht
   * ein und die Zahl zählt doppelt.
   */
  addedWeight?: boolean;
  value: string;
  /** Übungsname, damit klar bleibt, wozu die Zahl gehört. */
  title: string;
  /** true = letztes Feld des letzten Satzes; dann steht „Fertig" auf dem Knopf. */
  isLast: boolean;
  onChange: (next: string) => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const N = t.athlete.numpad;
  // Das Dezimalzeichen der Sprache. Gerechnet wird überall mit
  // `.replace(",", ".")`, also gilt beides — ein Wert, der vor dem
  // Sprachwechsel mit Komma getippt wurde, bleibt lesbar.
  const SEP = N.decimalSep;

  // Hardware-Tastatur unterstützen — praktisch beim Testen am Rechner.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") return onClose();
      if (e.key === "Enter") return onNext();
      if (e.key === "Backspace") return onChange(value.slice(0, -1));
      if (/^[0-9]$/.test(e.key)) return press(e.key);
      if ((e.key === "," || e.key === ".") && kind === "weight")
        return press(SEP);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  function press(key: string) {
    if (key === SEP) {
      // Nur ein Trennzeichen, und nur beim Gewicht.
      if (kind !== "weight" || /[.,]/.test(value)) return;
      onChange(value === "" ? `0${SEP}` : `${value}${SEP}`);
      return;
    }
    // Führende Null verschlucken, damit nicht "07" entsteht.
    const next = value === "0" ? key : value + key;
    // Grenzen, die einen Tippfehler abfangen, ohne jemanden einzuengen.
    const asNumber = Number(next.replace(",", "."));
    if (kind === "weight" && asNumber > 999) return;
    if (kind === "reps" && asNumber > 200) return;
    if (kind === "rir" && asNumber > 10) return;
    onChange(next);
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div
      className="gym-pad"
      role="dialog"
      aria-modal="true"
      aria-label={
        kind === "weight" && addedWeight ? N.addedAria : N.label[kind]
      }
    >
      <div className="gym-pad__head">
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: "var(--pt-fs-sm)",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--g-dim)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: "var(--pt-fs-input)", fontWeight: 700 }}>
            {kind === "weight" && addedWeight ? N.added : N.label[kind]}{" "}
            <span
              style={{
                color: "var(--g-display)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {value === "" ? "–" : value}
            </span>
          </p>
        </div>
        <button
          type="button"
          className="gym-pad__close"
          onClick={onClose}
          aria-label={t.common.close}
        >
          <IconX size={18} />
        </button>
      </div>

      <p className="gym-pad__hint">{N.hint[kind]}</p>

      <div className="gym-pad__grid">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            className="gym-key"
            onClick={() => press(k)}
          >
            {k}
          </button>
        ))}
        <button
          type="button"
          className="gym-key"
          onClick={() => press(SEP)}
          disabled={kind !== "weight"}
          aria-label={N.decimalAria}
        >
          {SEP}
        </button>
        <button type="button" className="gym-key" onClick={() => press("0")}>
          0
        </button>
        <button
          type="button"
          className="gym-key"
          onClick={() => onChange(value.slice(0, -1))}
          aria-label={N.backspace}
        >
          ⌫
        </button>
      </div>

      <button type="button" className="gym-pad__next" onClick={onNext}>
        {isLast ? (
          <>
            <IconCheck size={18} strokeWidth={2.4} />
            {N.done}
          </>
        ) : (
          <>
            {N.next}
            <IconChevronRight size={18} />
          </>
        )}
      </button>
    </div>
  );
}
