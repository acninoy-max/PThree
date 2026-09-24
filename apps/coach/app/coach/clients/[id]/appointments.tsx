"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Appointment } from "@ptfive/types";
import { IconCheck, IconClock, IconPlus, IconX } from "@/app/icons";
import { setAppointmentStatusAction } from "@/app/actions";
import { NewAppointment } from "@/app/coach/schedule/form";
import type { ClientOption } from "@/app/coach/schedule/board";
import { weekdayDateTime } from "@/app/format";

const LOCATION: Record<Appointment["location"], string> = {
  gym: "Studio",
  park: "Park",
  home: "Zuhause",
  online: "Online",
};

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
          Termine
        </p>
        <button
          type="button"
          className="pt-iconbtn"
          onClick={() => setCreating(true)}
          aria-label="Termin anlegen"
          title="Termin anlegen"
        >
          <IconPlus size={17} />
        </button>
      </div>

      {unresolved.length > 0 && (
        <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          {unresolved.map((a) => (
            <div key={a.id}>
              <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-action)" }}>
                {weekdayDateTime(new Date(a.startsAt))} — Status offen
              </p>
              <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                <button
                  type="button"
                  className="pt-chipbtn pt-chipbtn--good"
                  disabled={pending}
                  onClick={() => setStatus(a.id, "completed")}
                >
                  <IconCheck size={13} /> Stattgefunden
                </button>
                <button
                  type="button"
                  className="pt-chipbtn pt-chipbtn--bad"
                  disabled={pending}
                  onClick={() => setStatus(a.id, "no_show")}
                >
                  <IconX size={13} /> No-Show
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {upcoming.length === 0 ? (
        <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}>
          Nichts geplant.
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
                  {weekdayDateTime(new Date(a.startsAt))}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--pt-fs-sm)",
                    color: "var(--pt-text-dim)",
                  }}
                >
                  {a.durationMinutes} Min · {LOCATION[a.location]}
                  {a.locationNote ? ` · ${a.locationNote}` : ""}
                </p>
              </div>
            </div>
          ))}
          {upcoming.length > 5 && (
            <p style={{ margin: 0, fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
              und {upcoming.length - 5} weitere
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
