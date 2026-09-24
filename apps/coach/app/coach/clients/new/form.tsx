"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createClientAction, type ActionResult } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="pt-btn" disabled={pending}>
      {pending ? "Wird angelegt …" : "Klient anlegen"}
    </button>
  );
}

export function NewClientForm() {
  const [state, action] = useFormState<ActionResult | null, FormData>(
    createClientAction,
    null,
  );

  return (
    <form
      action={action}
      className="pt-card"
      style={{ display: "grid", gap: 16 }}
    >
      <label style={{ display: "grid", gap: 6 }}>
        <span className="pt-label">Name *</span>
        <input name="fullName" required placeholder="Lisa Vermeer" autoFocus />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="pt-label">E-Mail</span>
        <input name="email" type="email" placeholder="lisa@example.com" />
        <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
          Optional. Wird für die Einladung vorgeschlagen.
        </span>
      </label>

      {/* Aus dem Erstgespräch. Der Athlet kann es später in seinem
          Profil korrigieren — hier steht, was du im Gespräch notiert
          hast. */}
      <label style={{ display: "grid", gap: 6, justifyItems: "start" }}>
        <span className="pt-label">Geburtsdatum</span>
        <input className="pt-datefield" name="birthDate" type="date" />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="pt-label">Level</span>
        <select name="level" defaultValue="beginner">
          <option value="beginner">Beginner — Technik und Basis</option>
          <option value="intermediate">
            Intermediate — Volumen und Vielfalt
          </option>
          <option value="pro">Pro — Feinschliff und Periodisierung</option>
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="pt-label">Ziele & Onboarding-Notizen</span>
        <textarea
          name="goal"
          rows={7}
          placeholder={`Bankdrücken 80 kg bis Weihnachten
Knie links: alte Meniskus-OP, tiefe Kniebeuge meiden
Trainiert Di + Do abends, Sa möglich
Kein Frühstück, isst erst ab 12 Uhr
Motivation: will beim Skifahren durchhalten`}
        />
        <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
          Alles rein, was du dir sonst auf einen Zettel schreibst — Ziele,
          Einschränkungen, Verfügbarkeit, Motivation.
        </span>
      </label>

      {state && !state.ok && (
        <p style={{ margin: 0, color: "var(--pt-action)", fontSize: "var(--pt-fs-base)" }}>
          {state.error}
        </p>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <SubmitButton />
      </div>
    </form>
  );
}
