"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Plan, PlanDay, PlanSlot } from "@ptfive/types";
import {
  IconAlert,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconPlus,
  IconX,
} from "@/app/icons";
import { muscleLabel, restLabel, supersetCodes } from "@/app/components";
import {
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  durationLabel,
  estimateMinutes,
  parseDay,
} from "@/app/plan-week";
import {
  addPlanDayAction,
  deletePlanAction,
  deletePlanDayAction,
  deleteSlotAction,
  moveSlotAction,
  renamePlanDayAction,
  setPlanDayGuidedAction,
  setPlanDayWeekdaysAction,
  updatePlanAction,
} from "../actions";
import { BLOCK_LABEL, SlotForm, type ExercisePick } from "./slot-form";
import { Spinner } from "@/app/spinner";
import type { SimpleResult } from "../actions";
import { dateMedium } from "@/app/format";

/** Welches Formular gerade offen ist. */
type Editing =
  | { kind: "new"; dayId: string }
  | { kind: "edit"; dayId: string; slot: PlanSlot }
  | null;

function SlotRow({
  slot,
  planId,
  exerciseName,
  code,
  first,
  last,
  onEdit,
  busy,
  busyKey,
  setBusy,
}: {
  slot: PlanSlot;
  planId: string;
  exerciseName: string | null;
  /** Supersatz-Code wie A1; null bei einzeln ausgeführten Slots. */
  code: string | null;
  first: boolean;
  last: boolean;
  onEdit: () => void;
  busy: boolean;
  /** Schlüssel der gerade laufenden Aktion — nur der zeigt den Kreis. */
  busyKey: string | null;
  setBusy: (key: string, fn: () => Promise<SimpleResult>) => void;
}) {
  return (
    <div className="pt-slot">
      {code && <span className="pt-code">{code}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flexWrap: "wrap",
            marginBottom: 3,
          }}
        >
          {/* Vorn steht, was der Trainer im Studio sagt: der Name der
              Übung. Die Muskelgruppe ordnet ein, sie benennt nicht. Nur
              wenn keine Übung gewählt ist, tritt sie nach vorn — dann ist
              sie das Einzige, was den Slot beschreibt. */}
          <span style={{ fontSize: "var(--pt-fs-md)", fontWeight: 600 }}>
            {exerciseName ?? slot.label}
          </span>
          <span className="pt-chip">{BLOCK_LABEL[slot.block]}</span>
          {!exerciseName && <span className="pt-chip">Übung frei</span>}
        </div>
        <p style={{ margin: 0, fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
          {slot.targetSets} × {slot.targetRepsMin}
          {slot.targetRepsMin !== slot.targetRepsMax &&
            `–${slot.targetRepsMax}`}{" "}
          Wdh. · {muscleLabel(slot.muscleGroup)}
          {/* Eine abweichende Bezeichnung ist eine Entscheidung des
              Trainers und darf nicht verschwinden, nur weil oben jetzt
              die Übung steht. */}
          {exerciseName && slot.label !== exerciseName
            ? ` · „${slot.label}"`
            : ""}
          {slot.tempo ? ` · Tempo ${slot.tempo}` : ""}
          {slot.restSeconds !== null
            ? ` · Pause ${restLabel(slot.restSeconds)}`
            : ""}
        </p>
        {slot.note && (
          <p
            style={{
              margin: "5px 0 0",
              fontSize: "var(--pt-fs-sm)",
              lineHeight: 1.45,
              color: "var(--pt-text-dim)",
              paddingLeft: 8,
              borderLeft: "2px solid var(--pt-border)",
            }}
          >
            {slot.note}
          </p>
        )}
      </div>

      <div className="pt-slot__actions">
        <button
          type="button"
          title="Nach oben"
          aria-label="Slot nach oben"
          disabled={busy || first}
          onClick={() =>
            setBusy(`move-${slot.id}-${"up"}`, () =>
              moveSlotAction(slot.id, planId, "up"),
            )
          }
          style={{ transform: "rotate(90deg)" }}
        >
          {busyKey === `move-${slot.id}-up` ? (
            <Spinner size={12} />
          ) : (
            <IconChevronLeft size={13} />
          )}
        </button>
        <button
          type="button"
          title="Nach unten"
          aria-label="Slot nach unten"
          disabled={busy || last}
          onClick={() =>
            setBusy(`move-${slot.id}-${"down"}`, () =>
              moveSlotAction(slot.id, planId, "down"),
            )
          }
          style={{ transform: "rotate(90deg)" }}
        >
          {busyKey === `move-${slot.id}-down` ? (
            <Spinner size={12} />
          ) : (
            <IconChevronRight size={13} />
          )}
        </button>
        <button
          type="button"
          title="Bearbeiten"
          onClick={onEdit}
          disabled={busy}
        >
          Bearb.
        </button>
        <button
          type="button"
          title="Löschen"
          aria-label="Slot löschen"
          disabled={busy}
          onClick={() =>
            setBusy(`del-slot-${slot.id}`, () =>
              deleteSlotAction(slot.id, planId),
            )
          }
        >
          {busyKey === `del-slot-${slot.id}` ? (
            <Spinner size={12} />
          ) : (
            <IconX size={13} />
          )}
        </button>
      </div>
    </div>
  );
}

function DayCard({
  day,
  planId,
  exerciseNames,
  onAddSlot,
  onEditSlot,
  onRenameOpen,
  busy,
  busyKey,
  setBusy,
}: {
  day: PlanDay;
  planId: string;
  exerciseNames: Map<string, string>;
  onAddSlot: () => void;
  onEditSlot: (slot: PlanSlot) => void;
  /** Meldet nach oben, ob hier ein Name unbestätigt offen steht. */
  onRenameOpen: (dayId: string, open: boolean) => void;
  busy: boolean;
  /** Schlüssel der gerade laufenden Aktion — nur der zeigt den Kreis. */
  busyKey: string | null;
  setBusy: (key: string, fn: () => Promise<SimpleResult>) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(day.title);
  const codes = supersetCodes(day.slots);

  function startRename() {
    setRenaming(true);
    onRenameOpen(day.id, true);
  }

  function stopRename() {
    setRenaming(false);
    onRenameOpen(day.id, false);
  }

  function saveTitle() {
    if (title.trim() === "") return;
    stopRename();
    // Unveränderter Name braucht keinen Netzweg.
    if (title.trim() === day.title) return;
    setBusy(`rename-${day.id}`, () =>
      renamePlanDayAction(day.id, planId, title),
    );
  }

  return (
    <div className="pt-card" style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        {renaming ? (
          // Ein Textfeld ist die eine Stelle, an der ein Speichern-Knopf
          // wirklich hingehört: Man muss sehen können, wann man fertig
          // ist. Enter tut dasselbe, Escape verwirft.
          <div style={{ display: "flex", gap: 6, flex: 1, minWidth: 0 }}>
            <input
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") {
                  setTitle(day.title);
                  stopRename();
                }
              }}
              style={{ fontSize: "var(--pt-fs-lg)", fontWeight: 600 }}
            />
            <button
              type="button"
              className="pt-iconbtn"
              title="Speichern"
              aria-label="Namen speichern"
              disabled={busy || title.trim() === ""}
              onClick={saveTitle}
              style={{ flex: "none", color: "var(--pt-action)" }}
            >
              {busyKey === `rename-${day.id}` ? (
                <Spinner size={14} />
              ) : (
                <IconCheck size={16} strokeWidth={2.4} />
              )}
            </button>
            <button
              type="button"
              className="pt-iconbtn"
              title="Verwerfen"
              aria-label="Umbenennen abbrechen"
              onClick={() => {
                setTitle(day.title);
                stopRename();
              }}
              style={{ flex: "none" }}
            >
              <IconX size={15} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startRename}
            title="Umbenennen"
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "var(--pt-fs-lg)",
              fontWeight: 600,
              color: "var(--pt-text)",
              textAlign: "left",
            }}
          >
            {day.title}
          </button>
        )}

        <button
          type="button"
          className="pt-iconbtn"
          title="Tag löschen"
          aria-label={`Tag ${day.title} löschen`}
          disabled={busy}
          onClick={() =>
            setBusy(`del-day-${day.id}`, () =>
              deletePlanDayAction(day.id, planId),
            )
          }
        >
          {busyKey === `del-day-${day.id}` ? (
            <Spinner size={14} />
          ) : (
            <IconX size={15} />
          )}
        </button>
      </div>

      {/* Wochentage. Mehrfachauswahl, weil derselbe Tag mehrmals pro
          Woche liegen darf — Upper/Lower ist der Normalfall. Optional
          bleibt es trotzdem: Nicht jeder Klient trainiert nach Kalender,
          und ein Pflichtfeld würde die zwingen, etwas zu behaupten. */}
      <div>
        <span
          className="pt-label"
          style={{ display: "block", marginBottom: 6 }}
        >
          Wochentage
        </span>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {WEEKDAY_SHORT.map((label, i) => {
            const n = i + 1;
            const active = day.weekdays.includes(n);
            return (
              <button
                key={n}
                type="button"
                className="pt-toggle pt-toggle--day"
                data-active={active}
                aria-pressed={active}
                aria-label={`${WEEKDAY_LONG[i]}${active ? " entfernen" : " hinzufügen"}`}
                disabled={busy}
                onClick={() =>
                  // Nochmal antippen nimmt den Tag wieder heraus.
                  setBusy(`weekday-${day.id}-${n}`, () =>
                    setPlanDayWeekdaysAction(
                      day.id,
                      planId,
                      active
                        ? day.weekdays.filter((w) => w !== n)
                        : [...day.weekdays, n],
                    ),
                  )
                }
              >
                {busyKey === `weekday-${day.id}-${n}` ? (
                  <Spinner size={13} />
                ) : (
                  label
                )}
              </button>
            );
          })}
          <button
            type="button"
            className="pt-toggle"
            data-active={day.weekdays.length === 0}
            aria-pressed={day.weekdays.length === 0}
            disabled={busy}
            onClick={() =>
              setBusy(`weekday-${day.id}-frei`, () =>
                setPlanDayWeekdaysAction(day.id, planId, []),
              )
            }
          >
            {busyKey === `weekday-${day.id}-frei` ? (
              <Spinner size={13} />
            ) : (
              "frei"
            )}
          </button>
        </div>

        {/* Was gewählt wurde, im Klartext — bei zwei Terminen pro Woche
            ist die Frage „wie oft" wichtiger als „welche Kästchen". */}
        <p
          style={{
            margin: "6px 0 0",
            fontSize: "var(--pt-fs-sm)",
            color: "var(--pt-text-dim)",
          }}
        >
          {day.weekdays.length === 0
            ? "Ohne festen Tag — der Athlet trainiert, wann es passt."
            : `${day.weekdays.map((w) => WEEKDAY_LONG[w - 1]).join(", ")}` +
              (day.weekdays.length > 1
                ? ` · ${day.weekdays.length}× pro Woche`
                : "")}
        </p>
      </div>

      {/* Betreut oder allein — bestimmt, was der Athlet oben sieht,
          und trennt später betreute von selbstständigen Einheiten. */}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          className="pt-toggle"
          data-active={!day.isGuided}
          disabled={busy}
          onClick={() =>
            setBusy(`guided-${day.id}-false`, () =>
              setPlanDayGuidedAction(day.id, planId, false),
            )
          }
          style={{ flex: 1, fontSize: "var(--pt-fs-sm)" }}
        >
          {busyKey === `guided-${day.id}-false` ? (
            <Spinner size={13} />
          ) : (
            "Allein"
          )}
        </button>
        <button
          type="button"
          className="pt-toggle"
          data-active={day.isGuided}
          disabled={busy}
          onClick={() =>
            setBusy(`guided-${day.id}-true`, () =>
              setPlanDayGuidedAction(day.id, planId, true),
            )
          }
          style={{ flex: 1, fontSize: "var(--pt-fs-sm)" }}
        >
          {busyKey === `guided-${day.id}-true` ? (
            <Spinner size={13} />
          ) : (
            "Mit Trainer"
          )}
        </button>
      </div>

      {day.slots.length > 0 && (
        <p
          style={{
            margin: 0,
            fontSize: "var(--pt-fs-sm)",
            color: "var(--pt-text-dim)",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <IconClock size={13} />
          {/* Exakt die Zahl, die der Athlet in seiner App sieht. */}
          ca. {durationLabel(estimateMinutes(day.slots))} · {day.slots.length}{" "}
          {day.slots.length === 1 ? "Übung" : "Übungen"}
        </p>
      )}

      {day.slots.length === 0 ? (
        <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}>
          Noch kein Slot. Ein Slot ist eine Muskelgruppe — die Übung darin ist
          austauschbar, ohne dass die Historie abreißt.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {day.slots.map((slot, i) => (
            <SlotRow
              key={slot.id}
              slot={slot}
              planId={planId}
              exerciseName={
                slot.defaultExerciseId
                  ? (exerciseNames.get(slot.defaultExerciseId) ?? null)
                  : null
              }
              code={codes.get(slot.id) ?? null}
              first={i === 0}
              last={i === day.slots.length - 1}
              onEdit={() => onEditSlot(slot)}
              busy={busy}
              busyKey={busyKey}
              setBusy={setBusy}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        className="pt-btn pt-btn--ghost"
        onClick={onAddSlot}
        disabled={busy}
        style={{ justifyContent: "center" }}
      >
        <IconPlus size={15} />
        Slot
      </button>
    </div>
  );
}

export function PlanEditor({
  plan,
  clientName,
  exercises,
}: {
  plan: Plan;
  clientName: string;
  exercises: ExercisePick[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Editing>(null);
  const [newDay, setNewDay] = useState("");
  const [addingDay, setAddingDay] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // Welche Tagesnamen gerade offen im Feld stehen. Solange einer offen
  // ist, darf man nicht wegklicken — sonst wäre genau das Getippte weg.
  const [openRenames, setOpenRenames] = useState<Set<string>>(new Set());

  function trackRename(dayId: string, open: boolean) {
    setOpenRenames((prev) => {
      const next = new Set(prev);
      if (open) next.add(dayId);
      else next.delete(dayId);
      return next;
    });
  }
  const [error, setError] = useState<string | null>(null);

  const exerciseNames = new Map(exercises.map((e) => [e.id, e.name]));

  /**
   * Führt eine Aktion aus und zeigt an, dass etwas läuft.
   *
   * Das Ergebnis wird ausgewertet — vorher fiel jeder Fehler stumm unter
   * den Tisch, und ein Klick, der nichts tat, war von einem Klick, der
   * fehlschlug, nicht zu unterscheiden.
   */
  function run(key: string, fn: () => Promise<SimpleResult>) {
    setError(null);
    setBusyKey(key);
    startTransition(async () => {
      try {
        const result = await fn();
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSavedAt(Date.now());
        router.refresh();
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Unerwarteter Fehler beim Speichern.",
        );
      } finally {
        setBusyKey(null);
      }
    });
  }

  const slotCount = plan.days.reduce((n, d) => n + d.slots.length, 0);

  return (
    <main className="pt-shell">
      <Link
        href={`/coach/clients/${plan.clientId}`}
        style={{ fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}
      >
        ‹ {clientName}
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
        <div>
          <p className="pt-label" style={{ margin: 0 }}>
            Trainingsplan
            {plan.isActive ? (
              <span style={{ color: "#3b6d11" }}> · aktiv</span>
            ) : (
              <span> · stillgelegt</span>
            )}
          </p>
          <h1 style={{ margin: "2px 0 0", fontSize: "var(--pt-fs-3xl)", fontWeight: 600 }}>
            {plan.name}
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "var(--pt-fs-base)",
              color: "var(--pt-text-dim)",
            }}
          >
            ab {dateMedium(parseDay(plan.startsOn))} · {plan.days.length}{" "}
            {plan.days.length === 1 ? "Tag" : "Tage"} · {slotCount} Slots
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {!plan.isActive && (
            <button
              type="button"
              className="pt-btn"
              disabled={pending || busyKey !== null}
              onClick={() =>
                run("activate", () =>
                  updatePlanAction(plan.id, { isActive: true }),
                )
              }
            >
              {busyKey === "activate" ? (
                <>
                  <Spinner size={15} />
                  Wird aktiviert …
                </>
              ) : (
                "Aktivieren"
              )}
            </button>
          )}
          <button
            type="button"
            className="pt-btn pt-btn--ghost"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
          >
            Plan löschen
          </button>
        </div>
      </div>

      {/* Fehler stehen dort, wo man nach einem folgenlosen Klick hinschaut. */}
      {error && (
        <div className="pt-error" role="alert">
          <span style={{ display: "flex", flex: "none", marginTop: 1 }}>
            <IconAlert size={16} />
          </span>
          <span>
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              style={{
                display: "block",
                marginTop: 6,
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
                fontWeight: 600,
                textDecoration: "underline",
                color: "inherit",
              }}
            >
              Ausblenden
            </button>
          </span>
        </div>
      )}

      {slotCount === 0 && (
        <div
          className="pt-card"
          style={{
            marginBottom: 20,
            borderLeft: "3px solid var(--pt-action)",
            borderRadius: "0 12px 12px 0",
            display: "flex",
            alignItems: "center",
            gap: 9,
          }}
        >
          <span style={{ color: "var(--pt-action)", display: "flex" }}>
            <IconAlert size={17} />
          </span>
          <p style={{ margin: 0, fontSize: "var(--pt-fs-base)" }}>
            Der Plan hat noch keine Slots — in der Athleten-App erscheint er
            deshalb noch nicht.
          </p>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 14,
          alignItems: "start",
        }}
      >
        {plan.days.map((day) => (
          <DayCard
            key={day.id}
            day={day}
            planId={plan.id}
            exerciseNames={exerciseNames}
            onAddSlot={() => setEditing({ kind: "new", dayId: day.id })}
            onEditSlot={(slot) =>
              setEditing({ kind: "edit", dayId: day.id, slot })
            }
            onRenameOpen={trackRename}
            busy={pending || busyKey !== null}
            busyKey={busyKey}
            setBusy={run}
          />
        ))}

        <div className="pt-card" style={{ borderStyle: "dashed" }}>
          {addingDay ? (
            <div style={{ display: "grid", gap: 8 }}>
              <input
                value={newDay}
                autoFocus
                placeholder="z. B. Tag A — Oberkörper"
                onChange={(e) => setNewDay(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setAddingDay(false);
                    setNewDay("");
                  }
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="pt-btn"
                  disabled={pending || newDay.trim() === ""}
                  onClick={() => {
                    const title = newDay;
                    setNewDay("");
                    setAddingDay(false);
                    run("add-day", () => addPlanDayAction(plan.id, title));
                  }}
                >
                  {busyKey === "add-day" ? (
                    <>
                      <Spinner size={15} />
                      Wird angelegt …
                    </>
                  ) : (
                    "Anlegen"
                  )}
                </button>
                <button
                  type="button"
                  className="pt-btn pt-btn--ghost"
                  onClick={() => {
                    setAddingDay(false);
                    setNewDay("");
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="pt-btn pt-btn--ghost"
              onClick={() => setAddingDay(true)}
              style={{ justifyContent: "center" }}
            >
              <IconPlus size={15} />
              Trainingstag
            </button>
          )}
        </div>
      </div>

      {/* Fester Abschluss. Der Editor speichert jede Änderung sofort —
          aber ohne sichtbaren Endpunkt weiß man nie, ob man fertig ist.
          Die Leiste sagt beides: was der Stand ist und wie man rauskommt. */}
      <div className="pt-savebar">
        <span className="pt-savebar__status">
          {busyKey !== null ? (
            <>
              <Spinner size={15} />
              Wird gespeichert …
            </>
          ) : error !== null ? (
            <span
              style={{ color: "var(--pt-action)", display: "flex", gap: 6 }}
            >
              <IconAlert size={15} />
              Nicht gespeichert
            </span>
          ) : savedAt !== null ? (
            <span style={{ color: "#2f5a0e", display: "flex", gap: 6 }}>
              <IconCheck size={15} strokeWidth={2.6} />
              Alle Änderungen gespeichert
            </span>
          ) : (
            "Noch nichts geändert"
          )}
        </span>

        <button
          type="button"
          className="pt-btn"
          disabled={busyKey !== null || openRenames.size > 0}
          title={
            openRenames.size > 0
              ? "Es steht noch ein Tagesname offen — erst speichern oder verwerfen."
              : undefined
          }
          onClick={() => router.push(`/coach/clients/${plan.clientId}`)}
        >
          <IconCheck size={17} strokeWidth={2.4} />
          {openRenames.size > 0
            ? "Erst Tagesnamen speichern"
            : `Fertig — zurück zu ${clientName}`}
        </button>
      </div>

      {editing && (
        <SlotForm
          dayId={editing.dayId}
          planId={plan.id}
          slot={editing.kind === "edit" ? editing.slot : undefined}
          exercises={exercises}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      {confirmDelete && (
        <div
          className="pt-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Plan löschen"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDelete(false);
          }}
        >
          <div className="pt-sheet">
            <h2 style={{ margin: "0 0 8px", fontSize: "var(--pt-fs-xl)", fontWeight: 600 }}>
              Plan löschen?
            </h2>
            <p
              style={{
                margin: "0 0 18px",
                fontSize: "var(--pt-fs-md)",
                lineHeight: 1.55,
                color: "var(--pt-text-dim)",
              }}
            >
              „{plan.name}" mit allen Tagen und Slots wird entfernt. Bereits
              geloggte Einheiten bleiben erhalten — sie verlieren nur den Bezug
              zu diesem Plan.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="pt-btn"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await deletePlanAction(plan.id);
                    router.push(`/coach/clients/${plan.clientId}`);
                  })
                }
              >
                Endgültig löschen
              </button>
              <button
                type="button"
                className="pt-btn pt-btn--ghost"
                onClick={() => setConfirmDelete(false)}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
