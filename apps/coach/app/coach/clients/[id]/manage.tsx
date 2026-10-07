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
import { useT } from "@/app/i18n/client";

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
  const t = useT();
  const M = t.coach.manage;
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
          {M.appAccess}
        </p>

        {hasAccount ? (
          <div style={{ display: "grid", gap: 10 }}>
            <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", color: "#1d6e56" }}>
              {M.linked(client.fullName)}
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
                {M.unlink}
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
                  {M.unlinkExplain(client.fullName)}
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
                    {pending ? M.unlinking : M.unlinkConfirm}
                  </button>
                  <button
                    type="button"
                    className="pt-btn pt-btn--ghost"
                    onClick={() => setConfirmUnlink(false)}
                  >
                    {t.common.cancel}
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
              {M.noAccount}
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
                {M.noEmail(client.fullName)}
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
                    {copied ? M.copied : M.copyLink}
                  </button>
                  <button
                    type="button"
                    className="pt-btn pt-btn--ghost"
                    onClick={invite}
                    disabled={pending}
                  >
                    {M.regenerate}
                  </button>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--pt-fs-sm)",
                    color: "var(--pt-text-dim)",
                  }}
                >
                  {M.newInvalidatesOld}
                </p>
              </div>
            ) : (
              <button
                type="button"
                className="pt-btn"
                onClick={invite}
                disabled={pending}
              >
                {pending ? M.moment : M.createInvite}
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
          {M.masterData}
        </p>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
            {M.name}
          </span>
          <input name="fullName" defaultValue={client.fullName} />
        </label>

        {/* Kontakt und Geburtstag. Der Athlet kann beides in seinem
            eigenen Profil ändern — hier steht es, damit du es aus dem
            Erstgespräch nachtragen kannst, bevor er einen Zugang hat. */}
        <div className="pt-cols">
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
              {M.email}
            </span>
            <input
              name="email"
              type="email"
              defaultValue={client.email ?? ""}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
              {M.birthDate}
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
            {M.goals}
          </span>
          <textarea name="goal" rows={7} defaultValue={client.goal ?? ""} />
        </label>

        <div className="pt-cols">
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
              {M.level}
            </span>
            <select name="level" defaultValue={client.level}>
              <option value="beginner">{t.labels.level.beginner}</option>
              <option value="intermediate">{t.labels.level.intermediate}</option>
              <option value="pro">{t.labels.level.pro}</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
              {M.status}
            </span>
            <select name="status" defaultValue={client.status}>
              <option value="active">{t.labels.clientStatus.active}</option>
              <option value="paused">{t.labels.clientStatus.paused}</option>
              <option value="archived">{t.labels.clientStatus.archived}</option>
            </select>
          </label>
        </div>

        <p style={{ margin: 0, fontSize: "var(--pt-fs-sm)", color: "var(--pt-text-dim)" }}>
          {M.pausedHint}
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
            {pending ? M.saving : M.save}
          </button>
          {saved && (
            <span style={{ fontSize: "var(--pt-fs-base)", color: "#1d6e56" }}>{M.saved}</span>
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
          {M.deleteTitle}
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
              {M.deleteExplain(client.fullName)}
            </p>
            <button
              type="button"
              className="pt-btn pt-btn--ghost"
              onClick={() => setConfirmDelete(true)}
              style={{ color: "var(--pt-action)" }}
            >
              {M.deleteStart}
            </button>
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "var(--pt-fs-sm)",
                color: "var(--pt-text-dim)",
                lineHeight: 1.5,
              }}
            >
              {M.pauseInstead}
            </p>
          </>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <p style={{ margin: 0, fontSize: "var(--pt-fs-base)", lineHeight: 1.55 }}>
              {M.confirmName}{" "}
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
                {pending ? M.deleting : M.deleteFinal}
              </button>
              <button
                type="button"
                className="pt-btn pt-btn--ghost"
                onClick={() => {
                  setConfirmDelete(false);
                  setConfirmText("");
                }}
              >
                {t.common.cancel}
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
