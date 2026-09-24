"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createInviteAction,
  deleteClientAction,
  unlinkClientAction,
  updateClientAction,
} from "@/app/actions";
import type { Client } from "@ptfive/types";

/**
 * Einladung und Stammdaten.
 *
 * Bewusst ein Client-Component-Block: Der Coach soll den Link sofort kopieren
 * können, ohne dass die Seite neu lädt.
 */
export function ManageClient({
  client,
  hasAccount,
}: {
  client: Client;
  hasAccount: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [unlinkHinweis, setUnlinkHinweis] = useState<string | null>(null);

  function invite() {
    setError(null);
    startTransition(async () => {
      const res = await createInviteAction(client.id);
      if (res.ok) setInviteUrl(res.url);
      else setError(res.error);
    });
  }

  async function copy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function save(form: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateClientAction(client.id, form);
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else setError(res.error);
    });
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Einladung */}
      <div className="pt-card">
        <p className="pt-label" style={{ margin: "0 0 8px" }}>
          App-Zugang
        </p>

        {hasAccount ? (
          <div style={{ display: "grid", gap: 10 }}>
            <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "#1d6e56" }}>
              Konto verknüpft — {client.fullName} kann die App nutzen.
            </p>

            {/* Der Ausweg, wenn sich jemand mit der falschen Adresse
                angemeldet hat. Ohne ihn läuft jede weitere Einladung
                ins Leere: Ein vergebener Klient wird nicht
                überschrieben. */}
            {!confirmUnlink ? (
              <button
                type="button"
                className="pt-btn pt-btn--ghost"
                onClick={() => setConfirmUnlink(true)}
                style={{ justifySelf: "start" }}
              >
                Zugang trennen …
              </button>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--pt-fs-base)",
                    lineHeight: 1.55,
                  }}
                >
                  Trennt die Verbindung zum Anmeldekonto. Pläne, Einheiten,
                  Check-ins und Fotos von {client.fullName} bleiben
                  vollständig erhalten — danach kannst du neu einladen.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className="pt-btn"
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      startTransition(async () => {
                        const res = await unlinkClientAction(client.id);
                        if (res.ok) {
                          setUnlinkHinweis(res.hinweis);
                          setConfirmUnlink(false);
                          router.refresh();
                        } else setError(res.error);
                      });
                    }}
                  >
                    {pending ? "Trennt …" : "Trennen"}
                  </button>
                  <button
                    type="button"
                    className="pt-btn pt-btn--ghost"
                    onClick={() => setConfirmUnlink(false)}
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}

            {unlinkHinweis && (
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--pt-fs-base)",
                  color: "var(--pt-text-dim)",
                }}
              >
                {unlinkHinweis}
              </p>
            )}

            {error && (
              <p
                style={{
                  margin: 0,
                  color: "var(--pt-action)",
                  fontSize: "var(--pt-fs-base)",
                }}
              >
                {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "var(--pt-fs-base)",
                color: "var(--pt-text-dim)",
                lineHeight: 1.5,
              }}
            >
              Noch kein Konto. Erzeuge einen Einladungslink und schick ihn per
              WhatsApp oder Mail. Der Link gilt 14 Tage.
            </p>

            {/* Seit 0024 steht die Adresse auf der Einladeseite fest —
                sie kommt von hier. Fehlt sie, muss der Klient sie selbst
                eintippen, und genau dann können die beiden Adressen
                auseinanderlaufen. */}
            {!client.email && (
              <p
                style={{
                  margin: "-4px 0 12px",
                  fontSize: "var(--pt-fs-sm)",
                  color: "var(--pt-action)",
                  lineHeight: 1.5,
                }}
              >
                Für {client.fullName} ist keine E-Mail hinterlegt. Trag sie
                unten bei den Stammdaten ein — dann steht sie in der
                Einladung fest und kann nicht abweichen.
              </p>
            )}

            {inviteUrl ? (
              <div style={{ display: "grid", gap: 8 }}>
                <input
                  readOnly
                  value={inviteUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  style={{ fontSize: "var(--pt-fs-sm)" }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="pt-btn" onClick={copy}>
                    {copied ? "Kopiert" : "Link kopieren"}
                  </button>
                  <button
                    type="button"
                    className="pt-btn pt-btn--ghost"
                    onClick={invite}
                    disabled={pending}
                  >
                    Neu erzeugen
                  </button>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--pt-fs-sm)",
                    color: "var(--pt-text-dim)",
                  }}
                >
                  Ein neuer Link macht den alten ungültig.
                </p>
              </div>
            ) : (
              <button
                type="button"
                className="pt-btn"
                onClick={invite}
                disabled={pending}
              >
                {pending ? "Moment …" : "Einladungslink erzeugen"}
              </button>
            )}
          </>
        )}
      </div>

      {/* Stammdaten */}
      <form
        action={save}
        className="pt-card"
        style={{ display: "grid", gap: 14 }}
      >
        <p className="pt-label" style={{ margin: 0 }}>
          Stammdaten
        </p>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
            Name
          </span>
          <input name="fullName" defaultValue={client.fullName} />
        </label>

        {/* Kontakt und Geburtstag. Der Athlet kann beides in seinem
            eigenen Profil ändern — hier steht es, damit du es aus dem
            Erstgespräch nachtragen kannst, bevor er einen Zugang hat. */}
        <div className="pt-cols">
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
              E-Mail
            </span>
            <input
              name="email"
              type="email"
              defaultValue={client.email ?? ""}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
              Geburtsdatum
            </span>
            <input
              name="birthDate"
              type="date"
              defaultValue={client.birthDate ?? ""}
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
            Ziele & Notizen
          </span>
          <textarea name="goal" rows={7} defaultValue={client.goal ?? ""} />
        </label>

        <div className="pt-cols">
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
              Level
            </span>
            <select name="level" defaultValue={client.level}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="pro">Pro</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
              Status
            </span>
            <select name="status" defaultValue={client.status}>
              <option value="active">Aktiv</option>
              <option value="paused">Pausiert</option>
              <option value="archived">Archiviert</option>
            </select>
          </label>
        </div>

        <p style={{ margin: 0, fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
          Pausierte Klienten lösen keine Inaktivitäts-Hinweise mehr aus.
        </p>

        {error && (
          <p style={{ margin: 0, color: "var(--pt-action)", fontSize: "var(--pt-fs-base)" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="submit"
            className="pt-btn pt-btn--ghost"
            disabled={pending}
          >
            {pending ? "Speichert …" : "Speichern"}
          </button>
          {saved && (
            <span style={{ fontSize: "var(--pt-fs-base)", color: "#1d6e56" }}>Gespeichert</span>
          )}
        </div>
      </form>

      {/* Löschen — bewusst am Ende und mit Tipp-Bestätigung, damit es kein
          Versehen wird. */}
      <div
        className="pt-card"
        style={{ borderTop: "3px solid var(--pt-action)" }}
      >
        <p className="pt-label" style={{ margin: "0 0 8px" }}>
          Klient löschen
        </p>

        {!confirmDelete ? (
          <>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: "var(--pt-fs-base)",
                color: "var(--pt-text-dim)",
                lineHeight: 1.55,
              }}
            >
              Entfernt {client.fullName} samt Trainingshistorie, Terminen,
              Check-ins und Notizen. Das lässt sich nicht rückgängig machen.
            </p>
            <button
              type="button"
              className="pt-btn pt-btn--ghost"
              onClick={() => setConfirmDelete(true)}
              style={{ color: "var(--pt-action)" }}
            >
              Löschen …
            </button>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "var(--pt-fs-sm)",
                color: "var(--pt-text-dim)",
                lineHeight: 1.5,
              }}
            >
              Nur pausieren? Dann oben den Status auf „Pausiert“ setzen — die
              Daten bleiben erhalten.
            </p>
          </>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", lineHeight: 1.55 }}>
              Zum Bestätigen den Namen eingeben:{" "}
              <strong>{client.fullName}</strong>
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={client.fullName}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="pt-btn"
                disabled={pending || confirmText.trim() !== client.fullName}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const res = await deleteClientAction(client.id);
                    if (res.ok) router.push("/coach/clients");
                    else setError(res.error);
                  });
                }}
              >
                {pending ? "Löscht …" : "Endgültig löschen"}
              </button>
              <button
                type="button"
                className="pt-btn pt-btn--ghost"
                onClick={() => {
                  setConfirmDelete(false);
                  setConfirmText("");
                }}
              >
                Abbrechen
              </button>
            </div>
            {error && (
              <p style={{ margin: 0, color: "var(--pt-action)", fontSize: "var(--pt-fs-base)" }}>
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
