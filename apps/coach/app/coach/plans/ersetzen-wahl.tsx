"use client";

import { useT } from "@/app/i18n/client";

/**
 * Neuer Plan: den aktuellen ersetzen oder daneben stellen?
 *
 * Meeting 27.10.2026: Klienten haben oft zwei Pläne zugleich, einen mit
 * Trainer und einen für allein. Bis dahin legte jeder neue Plan den alten
 * still. Ersetzen bleibt der Standard; „daneben" muss man wählen.
 */
export function ErsetzenWahl({
  ersetzen,
  onChange,
}: {
  ersetzen: boolean;
  onChange: (ersetzen: boolean) => void;
}) {
  const t = useT();
  const W = t.coach.planChoice;
  return (
    <fieldset style={{ border: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
      <legend className="pt-label" style={{ padding: 0, marginBottom: 6 }}>
        {W.legend}
      </legend>
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "var(--pt-fs-md)" }}>
        <input type="radio" checked={ersetzen} onChange={() => onChange(true)} style={{ width: "auto", marginTop: 3 }} />
        <span>{W.replace}</span>
      </label>
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: "var(--pt-fs-md)" }}>
        <input type="radio" checked={!ersetzen} onChange={() => onChange(false)} style={{ width: "auto", marginTop: 3 }} />
        <span>{W.alongside}</span>
      </label>
    </fieldset>
  );
}
