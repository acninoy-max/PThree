"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Program } from "@ptfive/db";
import { muscleLabel, restLabel } from "@/app/components";
import { useT } from "@/app/i18n/client";
import { copyProgramAction } from "../../actions";
import { AssignDialog, type ClientPick } from "./assign-dialog";

/**
 * Vorlage aus der App — nur lesen, kopieren, zuweisen.
 *
 * Kein Editor: Die Zeilensicherheit ließe ohnehin nichts speichern, und
 * Knöpfe, die nichts tun, sind schlimmer als keine. Wer ändern will,
 * kopiert — die Kopie gehört ihm und öffnet im Editor.
 */
export function ProgramView({
  program,
  clients,
  exerciseNames,
}: {
  program: Program;
  clients: ClientPick[];
  exerciseNames: Record<string, string>;
}) {
  const t = useT();
  const P = t.coach.programs;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slots = program.days.reduce((n, d) => n + d.slots.length, 0);

  function copy() {
    setError(null);
    start(async () => {
      const res = await copyProgramAction(program.id, P.copyName(program.name));
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/coach/training/programs/${res.id}`);
    });
  }

  return (
    <main className="pt-shell">
      <Link
        href="/coach/training?tab=programs"
        style={{ fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}
      >
        {P.back}
      </Link>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          margin: "14px 0 14px",
        }}
      >
        <div>
          <p className="pt-label" style={{ margin: 0 }}>
            {P.kicker} · {P.appBadge}
          </p>
          <h1 style={{ margin: "2px 0 0", fontSize: "var(--pt-fs-3xl)", fontWeight: 600 }}>
            {program.name}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}>
            {t.labels.level[program.level]} · {P.summary(program.days.length, slots)}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="pt-btn" onClick={() => setAssigning(true)}>
            {P.assign}
          </button>
          <button type="button" className="pt-btn pt-btn--ghost" disabled={pending} onClick={copy}>
            {pending ? P.copying : P.copy}
          </button>
        </div>
      </div>

      <p style={{ margin: "0 0 18px", fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
        {program.description ? `${program.description} · ` : ""}
        {P.readOnly}
      </p>

      {error && (
        <p style={{ margin: "0 0 16px", fontSize: "var(--pt-fs-base)", color: "var(--pt-action)" }}>
          {error}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
          alignItems: "start",
        }}
      >
        {program.days.map((day) => (
          <div key={day.id} className="pt-card" style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0, fontSize: "var(--pt-fs-lg)", fontWeight: 600 }}>{day.title}</p>
            {day.slots.map((slot) => (
              <div key={slot.id} className="pt-slot">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", fontWeight: 600 }}>
                    {(slot.defaultExerciseId && exerciseNames[slot.defaultExerciseId]) ||
                      slot.label}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
                    {slot.targetSets} × {slot.targetRepsMin}
                    {slot.targetRepsMin !== slot.targetRepsMax && `–${slot.targetRepsMax}`}{" "}
                    {t.engine.units.reps} · {muscleLabel(t, slot.muscleGroup)}
                    {slot.restSeconds !== null
                      ? ` · ${t.common.rest} ${restLabel(slot.restSeconds)}`
                      : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {assigning && (
        <AssignDialog
          programId={program.id}
          programName={program.name}
          clients={clients}
          onClose={() => setAssigning(false)}
        />
      )}
    </main>
  );
}
