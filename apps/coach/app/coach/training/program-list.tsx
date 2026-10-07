"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Program } from "@ptfive/db";
import type { ExperienceLevel } from "@ptfive/types";
import { IconChevronRight, IconPlus, IconX } from "@/app/icons";
import { useT } from "@/app/i18n/client";
import { createProgramAction } from "./actions";

const LEVELS: readonly ExperienceLevel[] = ["beginner", "intermediate", "pro"];

/** Programmliste: Vorlagen aus der App oben, die eigenen darunter. */
export function ProgramList({ programs }: { programs: Program[] }) {
  const t = useT();
  const P = t.coach.programs;
  const [creating, setCreating] = useState(false);

  const system = programs.filter((p) => p.isSystem);
  const own = programs.filter((p) => !p.isSystem);

  return (
    <div style={{ maxWidth: 760 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 14,
        }}
      >
        <button type="button" className="pt-btn" onClick={() => setCreating(true)}>
          <IconPlus size={16} />
          {P.newProgram}
        </button>
      </div>

      <p className="pt-label" style={{ marginBottom: 4 }}>
        {P.yours}
      </p>
      {own.length === 0 ? (
        <div className="pt-card" style={{ marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}>
            {P.noneYet}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
          {own.map((p) => (
            <ProgramRow key={p.id} program={p} />
          ))}
        </div>
      )}

      {system.length > 0 && (
        <>
          <p className="pt-label" style={{ marginBottom: 4 }}>
            {P.appTemplates}
          </p>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: "var(--pt-fs-sm)",
              color: "var(--pt-text-dim)",
              lineHeight: 1.5,
            }}
          >
            {P.appTemplatesHint}
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {system.map((p) => (
              <ProgramRow key={p.id} program={p} />
            ))}
          </div>
        </>
      )}

      {creating && <NewProgram onClose={() => setCreating(false)} />}
    </div>
  );
}

function ProgramRow({ program }: { program: Program }) {
  const t = useT();
  const P = t.coach.programs;
  const slots = program.days.reduce((n, d) => n + d.slots.length, 0);
  return (
    <Link href={`/coach/training/programs/${program.id}`} className="pt-pickrow">
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
          {program.name}
          {program.isSystem && <span className="pt-chip">{P.appBadge}</span>}
        </span>
        <span
          style={{
            display: "block",
            fontSize: "var(--pt-fs-sm)",
            color: "var(--pt-text-dim)",
            marginTop: 2,
          }}
        >
          {t.labels.level[program.level]} · {P.summary(program.days.length, slots)}
        </span>
      </span>
      <IconChevronRight size={17} />
    </Link>
  );
}

/**
 * Neues Programm. Dieselben Startvorlagen wie beim Plan in der Akte —
 * ein leeres Formular ist die häufigste Ursache dafür, dass nie etwas
 * entsteht.
 */
function NewProgram({ onClose }: { onClose: () => void }) {
  const t = useT();
  const P = t.coach.programs;
  const C = t.coach.clientPlan;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [preset, setPreset] = useState(1);
  const [days, setDays] = useState<string[]>(C.presets[1]!.days);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<ExperienceLevel>("intermediate");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createProgramAction({
        name: name.trim() === "" ? C.presets[preset]!.label : name,
        level,
        dayTitles: days,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/coach/training/programs/${res.id}`);
    });
  }

  return (
    <div
      className="pt-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={P.createTitle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form onSubmit={submit} className="pt-sheet">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "var(--pt-fs-xl)", fontWeight: 600 }}>
            {P.createTitle}
          </h2>
          <button
            type="button"
            className="pt-iconbtn"
            onClick={onClose}
            aria-label={t.common.close}
          >
            <IconX size={17} />
          </button>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <span className="pt-label" style={{ display: "block", marginBottom: 7 }}>
              {C.template}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {C.presets.map((p, i) => (
                <button
                  key={p.label}
                  type="button"
                  className="pt-toggle"
                  data-active={preset === i}
                  onClick={() => {
                    setPreset(i);
                    setDays(p.days);
                  }}
                  title={p.hint}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="pt-label" style={{ display: "block", marginBottom: 7 }}>
              {C.trainingDays}
            </span>
            <div style={{ display: "grid", gap: 6 }}>
              {days.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 6 }}>
                  <input
                    value={d}
                    onChange={(e) =>
                      setDays((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                    }
                    placeholder={C.dayName(String.fromCharCode(65 + i))}
                  />
                  <button
                    type="button"
                    className="pt-iconbtn"
                    onClick={() => setDays((prev) => prev.filter((_, j) => j !== i))}
                    disabled={days.length === 1}
                    aria-label={C.removeDay(i + 1)}
                    style={{ flex: "none" }}
                  >
                    <IconX size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="pt-btn pt-btn--ghost"
              style={{ marginTop: 8 }}
              onClick={() =>
                setDays((prev) => [...prev, C.dayName(String.fromCharCode(65 + prev.length))])
              }
            >
              <IconPlus size={14} />
              {C.addDay}
            </button>
          </div>

          <div className="pt-cols">
            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">{P.name}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={C.presets[preset]!.label}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="pt-label">{P.level}</span>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as ExperienceLevel)}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {t.labels.level[l]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-action)" }}>
              {error}
            </p>
          )}

          <button type="submit" className="pt-btn" disabled={pending}>
            {pending ? C.creating : P.createAndFill}
          </button>
        </div>
      </form>
    </div>
  );
}
