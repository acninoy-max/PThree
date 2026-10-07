"use client";

import { useState, useTransition } from "react";
import { sendFeedbackAction } from "@/app/feedback-actions";
import { useT } from "@/app/i18n/client";

/**
 * Feedback-Feld im Profil — für Trainer und Athleten.
 *
 * Für den Test mit den ersten Trainern: Wer etwas bemerkt, soll es dort
 * aufschreiben können, wo er gerade ist, statt eine Mail zu suchen. Die
 * beiden Oberflächen haben verschiedene Klassen (pt- / gym-), deshalb
 * die Variante als Prop.
 */
export function FeedbackForm({ variante }: { variante: "coach" | "athlete" }) {
  const t = useT();
  const F = t.feedback;
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const gym = variante === "athlete";

  function send() {
    setError(null);
    start(async () => {
      const res = await sendFeedbackAction(text);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setText("");
      setSent(true);
    });
  }

  return (
    <div className={gym ? "gym-card" : "pt-card"}>
      <p className={gym ? "gym-label" : "pt-label"} style={{ margin: "0 0 6px" }}>
        {F.title}
      </p>
      <p
        style={{
          margin: "0 0 10px",
          fontSize: "var(--pt-fs-sm)",
          color: gym ? "var(--g-dim)" : "var(--pt-text-dim)",
          lineHeight: 1.5,
        }}
      >
        {F.intro}
      </p>
      <textarea
        className={gym ? "gym-textarea" : undefined}
        rows={4}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSent(false);
        }}
        placeholder={F.placeholder}
        maxLength={4000}
      />
      {error && (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "var(--pt-fs-base)",
            color: gym ? "var(--g-accent)" : "var(--pt-action)",
          }}
        >
          {error}
        </p>
      )}
      {sent && (
        <p style={{ margin: "8px 0 0", fontSize: "var(--pt-fs-base)", color: "#2f6b12" }}>
          {F.thanks}
        </p>
      )}
      <button
        type="button"
        className={gym ? "gym-btn" : "pt-btn"}
        style={{ marginTop: 10 }}
        disabled={pending || text.trim() === ""}
        onClick={send}
      >
        {pending ? F.sending : F.send}
      </button>
    </div>
  );
}
