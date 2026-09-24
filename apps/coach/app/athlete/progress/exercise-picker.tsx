"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconX } from "@/app/icons";
import { Spinner } from "@/app/spinner";
import { setProgressSelectionAction } from "@/app/athlete/actions";
import { dateMedium } from "@/app/format";

export interface PickerExercise {
  id: string;
  name: string;
  muscleLabel: string;
  sets: number;
  sessions: number;
  lastPerformedAt: string;
}

const MAX = 8;

/**
 * Auswahl der Übungen für die Fortschrittskurven.
 *
 * Zwei Dinge bestimmen den Aufbau. Erstens: Die Liste enthält ALLES, was
 * je geloggt wurde — auch die Übung von vor einem halben Jahr. Zweitens:
 * Gespeichert wird erst beim Schliessen, nicht bei jedem Antippen. Wer
 * fünf Häkchen setzt, soll nicht fünf Netzwege auslösen und dabei
 * zusehen, wie die Seite unter ihm neu lädt.
 */
export function ExercisePicker({
  exercises,
  selected,
  onClose,
}: {
  exercises: PickerExercise[];
  selected: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pick, setPick] = useState<string[]>(selected);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term === "") return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(term));
  }, [exercises, search]);

  function toggle(id: string) {
    setError(null);
    setPick((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) {
        setError(`Mehr als ${MAX} Kurven kann man nicht mehr lesen.`);
        return prev;
      }
      return [...prev, id];
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await setProgressSelectionAction(pick);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="gym-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Übungen für den Fortschritt wählen"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="gym-modal gym-modal--list">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "var(--pt-fs-xl)", fontWeight: 700 }}>
            Deine Übungen
          </h2>
          <button
            type="button"
            className="gym-iconbtn"
            onClick={onClose}
            aria-label="Schließen"
          >
            <IconX size={18} />
          </button>
        </div>

        <p
          style={{
            margin: "6px 0 0",
            fontSize: "var(--pt-fs-base)",
            color: "var(--g-dim)",
            lineHeight: 1.5,
            textAlign: "left",
          }}
        >
          Alles, was du je getrackt hast. Wähl die aus, die dich interessieren —{" "}
          {pick.length} von höchstens {MAX}.
        </p>

        {exercises.length > 8 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen"
            aria-label="Übung suchen"
            style={{ marginTop: 12 }}
          />
        )}

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gap: 6,
            maxHeight: "52vh",
            overflowY: "auto",
            textAlign: "left",
          }}
        >
          {shown.length === 0 && (
            <p style={{ margin: "8px 0", fontSize: "var(--pt-fs-md)", color: "var(--g-dim)" }}>
              Nichts gefunden.
            </p>
          )}
          {shown.map((e) => {
            const on = pick.includes(e.id);
            return (
              <button
                key={e.id}
                type="button"
                className="gym-pick"
                data-active={on}
                aria-pressed={on}
                onClick={() => toggle(e.id)}
              >
                <span className="gym-pick__box" aria-hidden>
                  {on && <IconCheck size={13} strokeWidth={3} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 600 }}>
                    {e.name}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: "var(--pt-fs-sm)",
                      color: "var(--g-dim)",
                      marginTop: 1,
                    }}
                  >
                    {e.muscleLabel} · {e.sets} {e.sets === 1 ? "Satz" : "Sätze"}{" "}
                    · zuletzt {dateMedium(new Date(e.lastPerformedAt))}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p
            style={{
              margin: "10px 0 0",
              fontSize: "var(--pt-fs-base)",
              color: "var(--g-accent)",
              textAlign: "left",
            }}
          >
            {error}
          </p>
        )}

        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          <button
            type="button"
            className="gym-btn"
            onClick={save}
            disabled={pending}
          >
            {pending ? <Spinner size={15} label="Speichert" /> : "Übernehmen"}
          </button>
          <button
            type="button"
            className="gym-btn gym-btn--ghost"
            onClick={onClose}
            disabled={pending}
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
