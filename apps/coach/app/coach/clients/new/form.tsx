"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createClientAction, type ActionResult } from "@/app/actions";
import { useT } from "@/app/i18n/client";

function SubmitButton() {
  const t = useT();
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="pt-btn" disabled={pending}>
      {pending ? t.coach.newClient.creating : t.coach.newClient.submit}
    </button>
  );
}

export function NewClientForm() {
  const t = useT();
  const n = t.coach.newClient;
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
        <span className="pt-label">{n.name}</span>
        <input name="fullName" required placeholder={n.namePlaceholder} autoFocus />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="pt-label">{n.email}</span>
        <input name="email" type="email" placeholder={n.emailPlaceholder} />
        <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
          {n.emailHint}
        </span>
      </label>

      {/* Aus dem Erstgespräch. Der Athlet kann es später in seinem
          Profil korrigieren — hier steht, was du im Gespräch notiert
          hast. */}
      <label style={{ display: "grid", gap: 6, justifyItems: "start" }}>
        <span className="pt-label">{n.birthDate}</span>
        <input className="pt-datefield" name="birthDate" type="date" />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="pt-label">{n.level}</span>
        <select name="level" defaultValue="beginner">
          <option value="beginner">{n.levels.beginner}</option>
          <option value="intermediate">{n.levels.intermediate}</option>
          <option value="pro">{n.levels.pro}</option>
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="pt-label">{n.goals}</span>
        <textarea
          name="goal"
          rows={7}
          placeholder={n.goalsPlaceholder}
        />
        <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
          {n.goalsHint}
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
