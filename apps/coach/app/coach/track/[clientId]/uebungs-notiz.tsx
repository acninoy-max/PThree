"use client";

import { useState, useTransition } from "react";
import { useT } from "@/app/i18n/client";
import { saveExerciseNoteAction } from "../actions";

/**
 * Trainer-Notiz zu einer Übung dieses Klienten (0031).
 *
 * Steht beim Tracken genau an der Übung, damit „Handgelenk ab 120 kg"
 * auftaucht, wenn es gebraucht wird, und nicht in einem Notizfeld der
 * Akte, das niemand mitten im Satz öffnet. Der Athlet sieht sie nicht.
 */
export function UebungsNotiz({
  clientId,
  exerciseId,
  note,
  onSaved,
}: {
  clientId: string;
  exerciseId: string;
  note: string | null;
  onSaved: (note: string | null) => void;
}) {
  const t = useT();
  const R = t.coach.track;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setError(null);
    start(async () => {
      const res = await saveExerciseNoteAction(clientId, exerciseId, draft);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onSaved(res.note);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder={R.notePlaceholder}
          autoFocus
        />
        {error && (
          <p style={{ margin: 0, fontSize: "var(--pt-fs-sm)", color: "var(--pt-action)" }}>{error}</p>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="pt-chipbtn" onClick={save} disabled={pending}>
            {pending ? t.common.saving : t.common.save}
          </button>
          <button
            type="button"
            className="pt-chipbtn"
            onClick={() => {
              setDraft(note ?? "");
              setEditing(false);
              setError(null);
            }}
            disabled={pending}
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <button
        type="button"
        className="pt-chipbtn"
        onClick={() => setEditing(true)}
        style={{ marginTop: 10, marginRight: 8 }}
      >
        {R.addNote}
      </button>
    );
  }

  return (
    <button type="button" className="pt-notiz" onClick={() => setEditing(true)} aria-label={R.editNote}>
      {note}
    </button>
  );
}
