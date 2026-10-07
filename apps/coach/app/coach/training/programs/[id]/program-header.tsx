"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Program } from "@ptfive/db";
import type { ExperienceLevel } from "@ptfive/types";
import { IconCheck, IconX } from "@/app/icons";
import { useT } from "@/app/i18n/client";
import { deleteProgramAction, updateProgramAction } from "../../actions";
import { AssignDialog, type ClientPick } from "./assign-dialog";

const LEVELS: readonly ExperienceLevel[] = ["beginner", "intermediate", "pro"];

/** Kopf eines eigenen Programms: Name, Niveau, Zuweisen, Löschen. */
export function ProgramHeader({
  program,
  clients,
}: {
  program: Program;
  clients: ClientPick[];
}) {
  const t = useT();
  const P = t.coach.programs;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(program.name);
  const [assigning, setAssigning] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const slots = program.days.reduce((n, d) => n + d.slots.length, 0);

  function save(patch: { name?: string; level?: ExperienceLevel }) {
    setError(null);
    start(async () => {
      const res = await updateProgramAction(program.id, patch);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRenaming(false);
      router.refresh();
    });
  }

  return (
    <>
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
          margin: "14px 0 22px",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p className="pt-label" style={{ margin: 0 }}>
            {P.kicker}
          </p>
          {renaming ? (
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <input
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save({ name });
                  if (e.key === "Escape") {
                    setName(program.name);
                    setRenaming(false);
                  }
                }}
                style={{ fontSize: "var(--pt-fs-xl)", fontWeight: 600 }}
              />
              <button
                type="button"
                className="pt-iconbtn"
                aria-label={t.common.save}
                disabled={pending || name.trim() === ""}
                onClick={() => save({ name })}
                style={{ flex: "none", color: "var(--pt-action)" }}
              >
                <IconCheck size={16} strokeWidth={2.4} />
              </button>
              <button
                type="button"
                className="pt-iconbtn"
                aria-label={t.common.cancel}
                onClick={() => {
                  setName(program.name);
                  setRenaming(false);
                }}
                style={{ flex: "none" }}
              >
                <IconX size={15} />
              </button>
            </div>
          ) : (
            <h1
              style={{
                margin: "2px 0 0",
                fontSize: "var(--pt-fs-3xl)",
                fontWeight: 600,
              }}
            >
              <button
                type="button"
                onClick={() => setRenaming(true)}
                title={P.rename}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  font: "inherit",
                  color: "inherit",
                  textAlign: "left",
                }}
              >
                {program.name}
              </button>
            </h1>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 6,
              fontSize: "var(--pt-fs-base)",
              color: "var(--pt-text-dim)",
              flexWrap: "wrap",
            }}
          >
            <select
              aria-label={P.level}
              value={program.level}
              disabled={pending}
              onChange={(e) => save({ level: e.target.value as ExperienceLevel })}
              style={{ width: "auto" }}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {t.labels.level[l]}
                </option>
              ))}
            </select>
            <span>{P.summary(program.days.length, slots)}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="pt-btn" onClick={() => setAssigning(true)}>
            {P.assign}
          </button>
          <button
            type="button"
            className="pt-btn pt-btn--ghost"
            onClick={() => setConfirmDelete(true)}
          >
            {P.deleteProgram}
          </button>
        </div>
      </div>

      {error && (
        <p style={{ margin: "-10px 0 16px", fontSize: "var(--pt-fs-base)", color: "var(--pt-action)" }}>
          {error}
        </p>
      )}

      {assigning && (
        <AssignDialog
          programId={program.id}
          programName={program.name}
          clients={clients}
          onClose={() => setAssigning(false)}
        />
      )}

      {confirmDelete && (
        <div
          className="pt-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={P.deleteProgram}
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDelete(false);
          }}
        >
          <div className="pt-sheet">
            <h2 style={{ margin: "0 0 8px", fontSize: "var(--pt-fs-xl)", fontWeight: 600 }}>
              {P.deleteQuestion}
            </h2>
            <p
              style={{
                margin: "0 0 18px",
                fontSize: "var(--pt-fs-md)",
                lineHeight: 1.55,
                color: "var(--pt-text-dim)",
              }}
            >
              {P.deleteExplain(program.name)}
            </p>
            {error && (
              <p style={{ margin: "0 0 12px", color: "var(--pt-action)" }}>{error}</p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="pt-btn"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await deleteProgramAction(program.id);
                    if (!res.ok) {
                      setError(res.error);
                      return;
                    }
                    router.push("/coach/training?tab=programs");
                  })
                }
              >
                {t.coach.editor.deleteFinal}
              </button>
              <button
                type="button"
                className="pt-btn pt-btn--ghost"
                onClick={() => setConfirmDelete(false)}
              >
                {t.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
