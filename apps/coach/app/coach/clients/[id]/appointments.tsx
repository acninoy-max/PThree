"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Appointment } from "@ptfive/types";
import { IconCheck, IconClock, IconPlus, IconX } from "@/app/icons";
import { setAppointmentStatusAction } from "@/app/actions";
import { NewAppointment } from "@/app/coach/schedule/form";
import type { ClientOption } from "@/app/coach/schedule/board";
import { useT } from "@/app/i18n/client";

/** Termine eines einzelnen Klienten — anlegen und Status nachtragen. */
export function ClientAppointments({
  client,
  upcoming,
  unresolved,
}: {
  client: ClientOption;
  upcoming: Appointment[];
  unresolved: Appointment[];
}) {
  const t = useT();
  const T = t.coach.clientAppointments;
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();

  function setStatus(id: string, status: Appointment["status"]) {
    startTransition(async () => {
      await setAppointmentStatusAction(id, status);
      router.refresh();
    });
  }

  return (
    <div className="pt-card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <p className="pt-label" style={{ margin: 0 }}>
          {T.title}
        </p>
        <button
          type="button"
          className="pt-iconbtn"
          onClick={() => setCreating(true)}
          aria-label={T.create}
          title={T.create}
        >
          <IconPlus size={17} />
        </button>
      </div>

      {unresolved.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          {unresolved.map((a) => (
            <div key={a.id}>
              <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-action)" }}>
                {T.statusOpen(t.fmt.weekdayDateTime(new Date(a.startsAt)))}
              </p>
              <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                <button
                  type="button"
                  className="pt-chipbtn pt-chipbtn--good"
                  disabled={pending}
                  onClick={() => setStatus(a.id, "completed")}
                >
                  <IconCheck size={13} /> {t.labels.apptStatus.completed}
                </button>
                <button
                  type="button"
                  className="pt-chipbtn pt-chipbtn--bad"
                  disabled={pending}
                  onClick={() => setStatus(a.id, "no_show")}
                >
                  <IconX size={13} /> {t.labels.apptStatus.no_show}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {upcoming.length === 0 ? (
        <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}>
          {T.nothing}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 9 }}>
          {upcoming.slice(0, 5).map((a) => (
            <div
              key={a.id}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <span style={{ color: "var(--pt-text-dim)", flex: "none" }}>
                <IconClock size={15} />
              </span>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", fontWeight: 500 }}>
                  {t.fmt.weekdayDateTime(new Date(a.startsAt))}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--pt-fs-sm)",
                    color: "var(--pt-text-dim)",
                  }}
                >
                  {a.durationMinutes} {T.minutesShort} · {t.labels.location[a.location]}
                  {a.locationNote ? ` · ${a.locationNote}` : ""}
                </p>
              </div>
            </div>
          ))}
          {upcoming.length > 5 && (
            <p style={{ margin: 0, fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
              {T.more(upcoming.length - 5)}
            </p>
          )}
        </div>
      )}

      {creating && (
        <NewAppointment
          clients={[client]}
          prefillClientId={client.id}
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
