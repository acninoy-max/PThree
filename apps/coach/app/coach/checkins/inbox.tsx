"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CheckInRecord } from "@ptfive/db";
import { Avatar } from "@/app/components";
import { IconCheck } from "@/app/icons";
import { replyToCheckInAction } from "@/app/actions";
import { toast } from "@/app/toast";
import { useT } from "@/app/i18n/client";
import type { Dict } from "@/app/i18n";

export interface InboxItem extends CheckInRecord {
  clientName: string;
  /** Veränderung zur zuletzt gemeldeten Woche, in Kilogramm. */
  deltaKg: number | null;
}

function weekLabel(t: Dict, weekOf: string): string {
  const start = new Date(`${weekOf}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${t.fmt.dayMonthShort(start)} – ${t.fmt.dayMonthShort(end)}`;
}

/** Bei Stress ist ein hoher Wert schlecht — die Skala läuft andersherum. */
const SCALES = [
  { key: "energy", inverted: false },
  { key: "sleep", inverted: false },
  { key: "stress", inverted: true },
] as const;

function scaleColor(value: number, inverted: boolean): string {
  const good = inverted ? value <= 2 : value >= 4;
  const bad = inverted ? value >= 4 : value <= 2;
  if (good) return "#3b6d11";
  if (bad) return "var(--pt-action)";
  return "var(--pt-text-dim)";
}

function Values({ item }: { item: InboxItem }) {
  const t = useT();
  const has =
    item.weightKg !== null || SCALES.some((s) => item[s.key] !== null);
  if (!has) return null;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 18,
        margin: "12px 0",
        paddingTop: 12,
        borderTop: "1px solid var(--pt-border)",
      }}
    >
      {item.weightKg !== null && (
        <div>
          <p className="pt-label" style={{ margin: 0 }}>
            {t.labels.weight}
          </p>
          <p style={{ margin: "3px 0 0", fontSize: "var(--pt-fs-xl)", fontWeight: 600 }}>
            {t.fmt.decimal(item.weightKg, 1)} kg
            {item.deltaKg !== null && item.deltaKg !== 0 && (
              <span
                style={{
                  marginLeft: 7,
                  fontSize: "var(--pt-fs-base)",
                  fontWeight: 500,
                  color: "var(--pt-text-dim)",
                }}
              >
                {item.deltaKg > 0 ? "+" : "\u2212"}
                {t.fmt.decimal(Math.abs(item.deltaKg), 1)}
              </span>
            )}
          </p>
        </div>
      )}

      {SCALES.map((s) => {
        const value = item[s.key];
        if (value === null) return null;
        return (
          <div key={s.key}>
            <p className="pt-label" style={{ margin: 0 }}>
              {t.athlete.checkin.scales[s.key].label}
            </p>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: "var(--pt-fs-xl)",
                fontWeight: 600,
                color: scaleColor(value, s.inverted),
              }}
            >
              {value}
              <span
                style={{
                  fontSize: "var(--pt-fs-sm)",
                  fontWeight: 500,
                  color: "var(--pt-text-dim)",
                }}
              >
                /5
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Eine Check-in-Karte samt Antwortfeld.
 * Wird im Posteingang und in der Klientenakte benutzt — die Antwort soll
 * an beiden Stellen gleich funktionieren und nicht zweimal gepflegt werden.
 */
export function CheckInCard({
  item,
  answered,
  showName = true,
}: {
  item: InboxItem;
  answered: boolean;
  showName?: boolean;
}) {
  const t = useT();
  const I = t.coach.inbox;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function send() {
    setError(null);
    startTransition(async () => {
      const result = await replyToCheckInAction(item.id, text);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setText("");
      // Die Antwort verschwindet aus dem Posteingang, sobald die Seite
      // neu lädt — ohne ein Wort dazu sieht es aus, als sei sie weg,
      // nicht als sei sie raus.
      toast(I.sentReply);
      router.refresh();
    });
  }

  return (
    <div
      className="pt-card"
      style={
        answered
          ? { marginBottom: 12 }
          : {
              marginBottom: 12,
              borderLeft: "3px solid var(--pt-action)",
              borderRadius: "0 12px 12px 0",
            }
      }
    >
      {showName ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={item.clientName} size={30} />
          <div style={{ minWidth: 0 }}>
            <Link
              href={`/coach/clients/${item.clientId}`}
              style={{ fontWeight: 500, color: "var(--pt-text)" }}
            >
              {item.clientName}
            </Link>
            <p
              style={{ margin: 0, fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}
            >
              {I.week(weekLabel(t, item.weekOf))}
              {item.submittedAt &&
                I.sentAt(t.fmt.weekdayTime(new Date(item.submittedAt)))}
            </p>
          </div>
        </div>
      ) : (
        // In der Klientenakte steht der Name schon oben auf der Seite.
        <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", fontWeight: 500 }}>
          {I.week(weekLabel(t, item.weekOf))}
          {item.submittedAt && (
            <span style={{ fontWeight: 400, color: "var(--pt-text-dim)" }}>
              {I.sentAt(t.fmt.weekdayTime(new Date(item.submittedAt)))}
            </span>
          )}
        </p>
      )}

      <Values item={item} />

      {item.clientNote && (
        <p
          style={{
            margin: "0 0 14px",
            fontSize: "var(--pt-fs-md)",
            lineHeight: 1.55,
            paddingLeft: 12,
            borderLeft: "2px solid var(--pt-border)",
          }}
        >
          {item.clientNote}
        </p>
      )}

      {answered ? (
        <div
          style={{
            background: "#f7f5f1",
            borderRadius: 9,
            padding: "10px 12px",
          }}
        >
          <p
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "var(--pt-fs-sm)",
              fontWeight: 600,
              color: "var(--pt-text-dim)",
            }}
          >
            <IconCheck size={13} />
            {I.yourReply}
            {item.coachRepliedAt &&
              ` · ${t.fmt.weekdayTime(new Date(item.coachRepliedAt))}`}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "var(--pt-fs-md)", lineHeight: 1.55 }}>
            {item.coachReply}
          </p>
        </div>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={I.replyTo(item.clientName.split(" ")[0] ?? "")}
            style={{
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
          />
          {error && (
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "var(--pt-fs-base)",
                color: "var(--pt-action)",
              }}
            >
              {error}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              type="button"
              className="pt-btn"
              onClick={send}
              disabled={pending || text.trim() === ""}
            >
              {pending ? I.sending : I.reply}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function CheckInInbox({
  open,
  answered,
}: {
  open: InboxItem[];
  answered: InboxItem[];
}) {
  const I = useT().coach.inbox;
  return (
    <div style={{ maxWidth: 680 }}>
      {open.length > 0 && (
        <>
          <p className="pt-label" style={{ marginBottom: 10 }}>
            {I.open}
          </p>
          {open.map((item) => (
            <CheckInCard key={item.id} item={item} answered={false} />
          ))}
        </>
      )}

      {answered.length > 0 && (
        <>
          <p className="pt-label" style={{ margin: "26px 0 10px" }}>
            {I.answered}
          </p>
          {answered.map((item) => (
            <CheckInCard key={item.id} item={item} answered />
          ))}
        </>
      )}
    </div>
  );
}
