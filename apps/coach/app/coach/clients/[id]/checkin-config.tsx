"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CheckInFields } from "@ptfive/db";
import { IconX } from "@/app/icons";
import { MEASURE_KEYS } from "@/app/athlete/checkin/measurements";
import { useT } from "@/app/i18n/client";
import { updateCheckInConfigAction } from "@/app/actions";

const RHYTHM = [1, 2, 4, 8, 12];

/**
 * Was das wöchentliche Check-in abfragt.
 *
 * Die Maße stehen bewusst getrennt vom Rhythmus: Wöchentliches Maßband
 * ist viel Aufwand für Werte, die sich langsamer ändern als sie
 * schwanken. Vier Wochen ist der Standard, nicht eine.
 */
export function CheckInConfig({
  clientId,
  fields,
}: {
  clientId: string;
  fields: CheckInFields;
}) {
  const t = useT();
  const C = t.coach.checkinConfig;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<CheckInFields>(fields);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateCheckInConfigAction(clientId, draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  const activeMeasures = MEASURE_KEYS.filter(
    (k) =>
      ({
        shoulders: fields.askShoulders,
        chest: fields.askChest,
        waist: fields.askWaist,
        arm: fields.askArm,
        thigh: fields.askThigh,
      })[k],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(fields);
          setOpen(true);
        }}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          fontSize: "var(--pt-fs-base)",
          color: "var(--pt-action)",
          fontWeight: 500,
        }}
      >
        {C.title}
      </button>

      {open && (
        <div
          className="pt-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={C.title}
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
                marginBottom: 18,
              }}
            >
              <h2 style={{ margin: 0, fontSize: "var(--pt-fs-xl)", fontWeight: 600 }}>
                {C.title}
              </h2>
              <button
                type="button"
                className="pt-iconbtn"
                onClick={() => setOpen(false)}
                aria-label={t.common.close}
              >
                <IconX size={17} />
              </button>
            </div>

            <div style={{ display: "grid", gap: 18 }}>
              <div>
                <span
                  className="pt-label"
                  style={{ display: "block", marginBottom: 8 }}
                >
                  {C.weekly}
                </span>
                <div style={{ display: "grid", gap: 8 }}>
                  {(
                    [
                      "askWeight",
                      "askEnergy",
                      "askSleep",
                      "askStress",
                      "askFreeText",
                    ] as const
                  ).map((key) => (
                    <label
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        fontSize: "var(--pt-fs-md)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={draft[key]}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, [key]: e.target.checked }))
                        }
                        style={{ width: "auto" }}
                      />
                      {C.fields[key]}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span
                  className="pt-label"
                  style={{ display: "block", marginBottom: 4 }}
                >
                  {C.tape}
                </span>
                <p
                  style={{
                    margin: "0 0 10px",
                    fontSize: "var(--pt-fs-sm)",
                    color: "var(--pt-text-dim)",
                    lineHeight: 1.45,
                  }}
                >
                  {C.tapeHint}
                </p>
                <div style={{ display: "grid", gap: 8 }}>
                  {MEASURE_KEYS.map((k) => {
                    const key = (
                      {
                        shoulders: "askShoulders",
                        chest: "askChest",
                        waist: "askWaist",
                        arm: "askArm",
                        thigh: "askThigh",
                      } as const
                    )[k];
                    return (
                      <label
                        key={k}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 9,
                          fontSize: "var(--pt-fs-md)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={draft[key]}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [key]: e.target.checked }))
                          }
                          style={{ width: "auto", marginTop: 3 }}
                        />
                        <span>
                          {t.labels.measure[k].label}
                          <span
                            style={{
                              display: "block",
                              fontSize: "var(--pt-fs-sm)",
                              color: "var(--pt-text-dim)",
                              lineHeight: 1.4,
                            }}
                          >
                            {t.labels.measure[k].how}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <span
                  className="pt-label"
                  style={{ display: "block", marginBottom: 7 }}
                >
                  {C.tapeEvery}
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {RHYTHM.map((w) => (
                    <button
                      key={w}
                      type="button"
                      className="pt-toggle"
                      data-active={draft.measureEveryWeeks === w}
                      onClick={() =>
                        setDraft((d) => ({ ...d, measureEveryWeeks: w }))
                      }
                    >
                      {C.weeks(w)}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--pt-fs-base)",
                    color: "var(--pt-action)",
                  }}
                >
                  {error}
                </p>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="pt-btn"
                  onClick={save}
                  disabled={pending}
                >
                  {pending ? t.common.saving : t.common.save}
                </button>
                <button
                  type="button"
                  className="pt-btn pt-btn--ghost"
                  onClick={() => setOpen(false)}
                >
                  {t.common.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeMeasures.length > 0 && (
        <p
          style={{
            margin: "6px 0 0",
            fontSize: "var(--pt-fs-sm)",
            color: "var(--pt-text-dim)",
            lineHeight: 1.45,
          }}
        >
          {C.summary(
            fields.measureEveryWeeks,
            activeMeasures.map((k) => t.labels.measure[k].label).join(", "),
          )}
        </p>
      )}
    </>
  );
}
