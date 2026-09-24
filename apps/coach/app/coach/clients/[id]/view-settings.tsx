"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconGear,
  IconX,
} from "@/app/icons";
import { Spinner } from "@/app/spinner";
import { toast } from "@/app/toast";
import { setClientViewSectionsAction } from "@/app/coach/plans/actions";
import { SECTIONS, SECTION_KEYS, type SectionKey } from "./sections";

/**
 * Das Zahnrad oben rechts in der Klientenakte.
 *
 * Aus dem Meeting 16.09: Die Akte ist zu voll, jeder Trainer braucht
 * andere Blöcke, und die Reihenfolge soll er selbst bestimmen.
 *
 * ZWEI ENTSCHEIDUNGEN ZUR BEDIENUNG
 *
 * 1. **Pfeile statt Ziehen.** Drag-and-drop sieht in einer Demo besser
 *    aus, aber der Trainer bedient das mit einer Hand am Handy, während
 *    er neben dem Klienten steht. Ein Ziehziel von 44px, das beim
 *    Scrollen losgeht, ist dort keine Bedienung, sondern ein Glücksspiel.
 *    Zwei Knöpfe treffen immer.
 *
 * 2. **Die Einstellung gilt für alle Klienten.** „Bei Anna oben, bei Ben
 *    unten" ist kein Bedürfnis, das jemand hat — wer so arbeitet,
 *    arbeitet bei jedem gleich. Eine Einstellung je Klient hiesse,
 *    sie zwanzigmal zu pflegen, und die zwanzigste wäre nie richtig.
 *    Der Text im Dialog sagt das, damit niemand es ausprobieren muss.
 */
export function ViewSettings({
  order,
  hidden,
}: {
  /** Aktuelle Reihenfolge, alle Abschnitte. */
  order: SectionKey[];
  /** Welche davon ausgeblendet sind. */
  hidden: SectionKey[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [entwurf, setEntwurf] = useState<SectionKey[]>(order);
  const [aus, setAus] = useState<Set<SectionKey>>(new Set(hidden));

  function oeffnen() {
    setEntwurf(order);
    setAus(new Set(hidden));
    setError(null);
    setOpen(true);
  }

  function schieben(index: number, richtung: -1 | 1) {
    const ziel = index + richtung;
    if (ziel < 0 || ziel >= entwurf.length) return;
    setEntwurf((prev) => {
      const next = [...prev];
      const [raus] = next.splice(index, 1);
      next.splice(ziel, 0, raus!);
      return next;
    });
  }

  function umschalten(key: SectionKey) {
    setError(null);
    setAus((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function zuruecksetzen() {
    setEntwurf([...SECTION_KEYS]);
    setAus(new Set());
    setError(null);
  }

  function speichern() {
    setError(null);
    // Alles abwählen hiesse: leere Akte. Das ist kein sinnvoller
    // Zustand, sondern ein Versehen — und es wäre von aussen nicht mehr
    // zu erkennen, dass da ein Klient ist.
    if (aus.size === entwurf.length) {
      setError("Mindestens ein Abschnitt muss sichtbar bleiben.");
      return;
    }

    startTransition(async () => {
      const res = await setClientViewSectionsAction(
        entwurf,
        entwurf.filter((k) => !aus.has(k)),
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast("Ansicht übernommen");
      router.refresh();
      setOpen(false);
    });
  }

  const sichtbar = entwurf.length - aus.size;

  return (
    <>
      {/*
        Symbol UND Text.

        Ein Zahnrad allein muss man raten — Aaron hat es im Studio für
        eine Sonne gehalten und nicht angetippt. Ein Knopf, den niemand
        findet, ist kein Knopf. Die 70px, die das Wort kostet, sind
        billiger als ein Feature, das keiner benutzt.

        „Ansicht" und nicht „Bearbeiten": Bearbeitet wird der Klient
        nicht, sondern nur, was man von ihm sieht.
      */}
      <button
        type="button"
        className="pt-btn pt-btn--ghost pt-viewbtn"
        onClick={oeffnen}
        title="Welche Abschnitte die Akte zeigt und in welcher Reihenfolge"
      >
        <IconGear size={16} />
        Ansicht
      </button>

      {open && (
        <div
          className="pt-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Klientenakte einrichten"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="pt-sheet">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <h2 style={{ margin: 0, fontSize: "var(--pt-fs-xl)", fontWeight: 600 }}>
                Akte einrichten
              </h2>
              <button
                type="button"
                className="pt-iconbtn"
                onClick={() => setOpen(false)}
                aria-label="Schließen"
              >
                <IconX size={17} />
              </button>
            </div>

            <p
              style={{
                margin: "0 0 14px",
                fontSize: "var(--pt-fs-sm)",
                color: "var(--pt-text-dim)",
                lineHeight: 1.5,
              }}
            >
              Was du hier einstellst, gilt für alle deine Klienten. Plan,
              Termine und Verwaltung bleiben immer stehen — ohne sie könntest
              du nicht arbeiten. {sichtbar} von {entwurf.length} Abschnitten
              sichtbar.
            </p>

            <div
              style={{
                display: "grid",
                gap: 6,
                maxHeight: "50vh",
                overflowY: "auto",
              }}
            >
              {entwurf.map((key, i) => {
                const def = SECTIONS.find((s) => s.key === key);
                const an = !aus.has(key);
                return (
                  <div key={key} className="pt-sortrow" data-off={!an}>
                    <button
                      type="button"
                      className="pt-sortrow__main"
                      aria-pressed={an}
                      onClick={() => umschalten(key)}
                    >
                      <span className="pt-pick__box" aria-hidden>
                        {an && <IconCheck size={12} strokeWidth={3} />}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: 600 }}>
                          {def?.label ?? key}
                        </span>
                        <span
                          style={{
                            display: "block",
                            fontSize: "var(--pt-fs-sm)",
                            color: "var(--pt-text-dim)",
                            marginTop: 1,
                            lineHeight: 1.35,
                          }}
                        >
                          {an ? (def?.hint ?? "") : "Ausgeblendet"}
                        </span>
                      </span>
                    </button>

                    <div className="pt-sortrow__moves">
                      <button
                        type="button"
                        onClick={() => schieben(i, -1)}
                        disabled={i === 0}
                        aria-label={`${def?.label ?? key} nach oben`}
                      >
                        <IconArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => schieben(i, 1)}
                        disabled={i === entwurf.length - 1}
                        aria-label={`${def?.label ?? key} nach unten`}
                      >
                        <IconArrowDown size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "var(--pt-fs-base)",
                  color: "var(--pt-action)",
                }}
              >
                {error}
              </p>
            )}

            <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="pt-btn"
                onClick={speichern}
                disabled={pending}
              >
                {pending ? <Spinner size={14} label="Speichert" /> : "Übernehmen"}
              </button>
              <button
                type="button"
                className="pt-btn pt-btn--ghost"
                onClick={zuruecksetzen}
                disabled={pending}
              >
                Standard wiederherstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
