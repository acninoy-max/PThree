"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AVATAR_BUCKET } from "@ptfive/db";
import { createClient } from "@/lib/supabase-browser";
import { IconLogout, IconPlus } from "@/app/icons";
import { Spinner } from "@/app/spinner";
import { toast } from "@/app/toast";
import { dateMedium } from "@/app/format";
import { initials } from "@/app/components";
import { photoFileName, shrinkImage } from "@/app/athlete/photos/shrink";
import {
  removeAvatarAction,
  saveAvatarAction,
  saveProfileAction,
} from "./actions";

/** Ein Profilbild braucht keine 1400px. */
const AVATAR_KANTE = 480;

export function ProfileForm({
  clientId,
  fullName,
  email,
  birthDate,
  avatarUrl,
  hasAvatar,
  loginEmail,
  startedOn,
}: {
  clientId: string;
  fullName: string;
  email: string;
  birthDate: string;
  avatarUrl: string | null;
  hasAvatar: boolean;
  loginEmail: string | null;
  startedOn: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);

  const [name, setName] = useState(fullName);
  const [mail, setMail] = useState(email);
  const [gebdat, setGebdat] = useState(birthDate);

  const dateiFeld = useRef<HTMLInputElement>(null);

  const geaendert =
    name !== fullName || mail !== email || gebdat !== birthDate;

  function speichern() {
    setError(null);
    setHinweis(null);
    startTransition(async () => {
      const res = await saveProfileAction({
        fullName: name,
        birthDate: gebdat === "" ? null : gebdat,
        email: mail,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.hinweis) setHinweis(res.hinweis);
      else toast("Profil gespeichert");
      router.refresh();
    });
  }

  async function bildWaehlen(datei: File) {
    setError(null);
    setUploading(true);
    try {
      const klein = await shrinkImage(datei, AVATAR_KANTE);
      const pfad = `${clientId}/${photoFileName()}`;

      const db = createClient();
      const { error: hochFehler } = await db.storage
        .from(AVATAR_BUCKET)
        .upload(pfad, klein.blob, {
          contentType: "image/jpeg",
          upsert: false,
        });
      if (hochFehler) {
        setError(`Hochladen fehlgeschlagen: ${hochFehler.message}`);
        return;
      }

      const res = await saveAvatarAction(pfad);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast("Bild gespeichert");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setUploading(false);
      if (dateiFeld.current) dateiFeld.current.value = "";
    }
  }

  function bildEntfernen() {
    setError(null);
    startTransition(async () => {
      const res = await removeAvatarAction();
      if (!res.ok) setError(res.error);
      else {
        toast("Bild entfernt");
        router.refresh();
      }
    });
  }

  async function abmelden() {
    await createClient().auth.signOut();
    window.location.assign("/login");
  }

  return (
    <>
      <p className="gym-label">Profil</p>
      <h1
        style={{
          margin: "3px 0 18px",
          fontSize: "var(--pt-fs-3xl)",
          fontWeight: 700,
        }}
      >
        Deine Daten
      </h1>

      {/* ---------- Bild ---------- */}
      <div
        className="gym-card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div className="gym-avatar">
          {avatarUrl ? (
            // Kein next/image: Die Adresse ist signiert und läuft ab —
            // der Bildoptimierer würde sie zwischenspeichern und danach
            // ins Leere greifen.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" />
          ) : (
            <span>{initials(fullName)}</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 8 }}>
          <input
            ref={dateiFeld}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const datei = e.target.files?.[0];
              if (datei) void bildWaehlen(datei);
            }}
          />
          <button
            type="button"
            className="gym-btn gym-btn--ghost"
            disabled={uploading || pending}
            onClick={() => dateiFeld.current?.click()}
          >
            {uploading ? (
              <Spinner size={15} label="Lädt hoch" />
            ) : (
              <>
                <IconPlus size={15} /> {hasAvatar ? "Anderes Bild" : "Bild wählen"}
              </>
            )}
          </button>
          {hasAvatar && (
            <button
              type="button"
              className="gym-btn gym-btn--ghost"
              disabled={pending || uploading}
              onClick={bildEntfernen}
            >
              Entfernen
            </button>
          )}
        </div>
      </div>

      {/* ---------- Stammdaten ---------- */}
      <div className="gym-card" style={{ display: "grid", gap: 14 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span className="gym-label">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>

        <label style={{ display: "grid", gap: 6, justifyItems: "start" }}>
          <span className="gym-label">Geburtsdatum</span>
          <input
            className="pt-datefield"
            type="date"
            value={gebdat}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setGebdat(e.target.value)}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span className="gym-label">E-Mail</span>
          <input
            type="email"
            value={mail}
            onChange={(e) => setMail(e.target.value)}
            autoComplete="email"
            placeholder="du@example.com"
          />
          {/*
            Der Satz, der eine Fehlersuche spart.

            Kontaktadresse und Anmeldeadresse sind zwei Dinge. Wer seine
            E-Mail ändert und danach mit der neuen nicht hereinkommt,
            hält die App für kaputt — also steht hier vorher, wie es
            läuft.
          */}
          <span
            style={{
              fontSize: "var(--pt-fs-sm)",
              color: "var(--g-dim)",
              lineHeight: 1.5,
            }}
          >
            {loginEmail
              ? `Anmelden tust du dich mit ${loginEmail}. Änderst du die Adresse hier, schicken wir dir einen Bestätigungslink — erst danach gilt die neue.`
              : "Hierhin schreibt dir dein Trainer."}
          </span>
        </label>

        {error && (
          <p
            style={{
              margin: 0,
              fontSize: "var(--pt-fs-md)",
              color: "var(--g-accent)",
              lineHeight: 1.5,
            }}
          >
            {error}
          </p>
        )}

        {hinweis && (
          <p
            style={{
              margin: 0,
              padding: "10px 12px",
              borderRadius: 10,
              background: "#fdf3f0",
              border: "1px solid #f2d2ca",
              fontSize: "var(--pt-fs-base)",
              lineHeight: 1.5,
            }}
          >
            {hinweis}
          </p>
        )}

        <button
          type="button"
          className="gym-btn"
          onClick={speichern}
          disabled={pending || !geaendert}
        >
          {pending ? (
            <Spinner size={15} label="Speichert" />
          ) : geaendert ? (
            "Speichern"
          ) : (
            "Gespeichert"
          )}
        </button>
      </div>

      {/* ---------- Was der Trainer pflegt ---------- */}
      <p
        style={{
          margin: "14px 0 0",
          fontSize: "var(--pt-fs-sm)",
          color: "var(--g-dim)",
          lineHeight: 1.55,
        }}
      >
        {startedOn && `Dabei seit ${dateMedium(new Date(startedOn))}. `}
        Level, Ziele und deinen Trainingsplan pflegt dein Trainer — die
        siehst du, aber änderst sie nicht hier.
      </p>

      {/* ---------- Abmelden ----------
          Stand vorher als fünfter Punkt in der Leiste unten, neben
          Heute, Plan, Check-in und Fortschritt. Abmelden ist keine
          Schwester von denen: Man tut es selten, und es beendet alles.
          Hier ist es richtig — und die vier täglichen Punkte sind
          dadurch breiter geworden. */}
      <button
        type="button"
        className="gym-btn gym-btn--ghost"
        style={{ marginTop: 22 }}
        onClick={abmelden}
      >
        <IconLogout size={16} /> Abmelden
      </button>
    </>
  );
}
