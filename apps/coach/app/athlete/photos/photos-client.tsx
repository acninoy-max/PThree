"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PHOTO_BUCKET, type ProgressPhoto } from "@ptfive/db";
import { createClient } from "@/lib/supabase-browser";
import { IconPlus, IconX } from "@/app/icons";
import { Spinner } from "@/app/spinner";
import { toast } from "@/app/toast";
import { dateMedium } from "@/app/format";
import { POSES, poseLabel, type Pose, type WeightPoint } from "./compare";
import { photoFileName, shrinkImage } from "./shrink";
import { PhotoCompare } from "@/app/photo-compare";
import {
  deletePhotoAction,
  grantPhotoConsentAction,
  revokePhotoConsentAction,
  savePhotoAction,
} from "./actions";
import {
  CONSENT_POINTS,
  CONSENT_SUMMARY,
  CONSENT_TITLE,
} from "./consent-text";

/** Heute als YYYY-MM-DD, in der Zeitzone des Geräts. */
function heute(): string {
  const d = new Date();
  const zwei = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

export function PhotosClient({
  clientId,
  hasConsent,
  grantedAt,
  photos,
  weights,
}: {
  clientId: string;
  hasConsent: boolean;
  grantedAt: string | null;
  photos: ProgressPhoto[];
  weights: WeightPoint[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!hasConsent) {
    return (
      <ConsentGate
        pending={pending}
        error={error}
        onGrant={() => {
          setError(null);
          startTransition(async () => {
            const res = await grantPhotoConsentAction();
            if (!res.ok) setError(res.error);
            else router.refresh();
          });
        }}
      />
    );
  }

  return (
    <Gallery
      clientId={clientId}
      grantedAt={grantedAt}
      photos={photos}
      weights={weights}
      onChanged={() => router.refresh()}
    />
  );
}

/**
 * Die Einwilligung, bevor irgendetwas hochgeladen werden kann.
 *
 * Kein Häkchen im Kleingedruckten: Körperfotos sind Gesundheitsdaten
 * nach Art. 9 DSGVO, und eine Einwilligung dafür muss ausdrücklich sein
 * und als solche erkennbar. Deshalb eine eigene Seite, ganze Sätze und
 * ein Knopf, den man bewusst drückt.
 *
 * Der Text fragt in der Reihenfolge, in der Menschen fragen: Worum geht
 * es, wer sieht das, wo liegt es, wie werde ich es wieder los.
 */
function ConsentGate({
  pending,
  error,
  onGrant,
}: {
  pending: boolean;
  error: string | null;
  onGrant: () => void;
}) {
  return (
    <>
      <p className="gym-label" style={{ marginTop: 14 }}>
        Fotos
      </p>
      <h1 style={{ margin: "3px 0 14px", fontSize: "var(--pt-fs-2xl)", fontWeight: 700 }}>
        {CONSENT_TITLE}
      </h1>

      <div className="gym-card" style={{ display: "grid", gap: 16 }}>
        {CONSENT_POINTS.map((p) => (
          <div key={p.frage}>
            <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", fontWeight: 700 }}>
              {p.frage}
            </p>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: "var(--pt-fs-md)",
                lineHeight: 1.55,
                color: "var(--g-dim)",
              }}
            >
              {p.text}
            </p>
          </div>
        ))}
      </div>

      <p
        style={{
          margin: "16px 0 12px",
          fontSize: "var(--pt-fs-md)",
          lineHeight: 1.55,
          fontWeight: 600,
        }}
      >
        {CONSENT_SUMMARY}
      </p>

      {error && (
        <p style={{ margin: "0 0 10px", fontSize: "var(--pt-fs-md)", color: "var(--g-accent)" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        className="gym-btn"
        onClick={onGrant}
        disabled={pending}
      >
        {pending ? <Spinner size={15} label="Moment" /> : "Einverstanden"}
      </button>

      <p
        style={{
          margin: "12px 0 0",
          fontSize: "var(--pt-fs-sm)",
          lineHeight: 1.5,
          color: "var(--g-dim)",
        }}
      >
        Wenn du nicht einverstanden bist, ändert sich nichts — der Rest der
        App funktioniert genauso.
      </p>
    </>
  );
}

function Gallery({
  clientId,
  grantedAt,
  photos,
  weights,
  onChanged,
}: {
  clientId: string;
  grantedAt: string | null;
  photos: ProgressPhoto[];
  weights: WeightPoint[];
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pose, setPose] = useState<Pose>("front");
  const [takenOn, setTakenOn] = useState(heute());
  const [revoking, setRevoking] = useState(false);
  const dateiFeld = useRef<HTMLInputElement>(null);

  async function aufnehmen(datei: File) {
    setError(null);
    setUploading(true);
    try {
      const klein = await shrinkImage(datei);
      const pfad = `${clientId}/${photoFileName()}`;

      // Direkt aus dem Browser in den Speicher. Die Anmeldung des
      // Athleten hängt am Client, also greifen dieselben Regeln wie
      // überall — ein Umweg über den Server hieße nur, ein paar hundert
      // Kilobyte zweimal zu schicken.
      const db = createClient();
      const { error: hochFehler } = await db.storage
        .from(PHOTO_BUCKET)
        .upload(pfad, klein.blob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (hochFehler) {
        setError(`Hochladen fehlgeschlagen: ${hochFehler.message}`);
        return;
      }

      const res = await savePhotoAction({
        storagePath: pfad,
        pose,
        takenOn,
        width: klein.width,
        height: klein.height,
        bytes: klein.blob.size,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast("Bild gespeichert");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setUploading(false);
      if (dateiFeld.current) dateiFeld.current.value = "";
    }
  }

  function loeschen(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await deletePhotoAction(id);
      if (!res.ok) setError(res.error);
      else {
        toast("Bild gelöscht");
        onChanged();
      }
    });
  }

  function widerrufen() {
    setError(null);
    startTransition(async () => {
      const res = await revokePhotoConsentAction();
      if (!res.ok) setError(res.error);
      else {
        setRevoking(false);
        onChanged();
      }
    });
  }

  return (
    <>
      <p className="gym-label" style={{ marginTop: 14 }}>
        Fotos
      </p>
      <h1 style={{ margin: "3px 0 4px", fontSize: "var(--pt-fs-2xl)", fontWeight: 700 }}>
        {photos.length === 0
          ? "Noch keine Bilder"
          : `${photos.length} ${photos.length === 1 ? "Bild" : "Bilder"}`}
      </h1>
      <p style={{ margin: "0 0 18px", fontSize: "var(--pt-fs-base)", color: "var(--g-dim)" }}>
        Nur du und dein Trainer sehen sie.
      </p>

      {/* ---------- Aufnehmen ---------- */}
      <div className="gym-card" style={{ marginBottom: 18 }}>
        <p style={{ margin: "0 0 12px", fontSize: "var(--pt-fs-lg)", fontWeight: 600 }}>
          Neues Bild
        </p>

        {/* Drei kurze Wörter nebeneinander — passt auch auf 320px. */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {POSES.map((p) => (
            <button
              key={p.key}
              type="button"
              className="mc-range"
              data-active={pose === p.key}
              aria-pressed={pose === p.key}
              onClick={() => setPose(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <label
          style={{
            display: "grid",
            gap: 6,
            marginBottom: 12,
            justifyItems: "start",
          }}
        >
          <span className="gym-label">Aufgenommen am</span>
          <input
            className="pt-datefield"
            type="date"
            value={takenOn}
            max={heute()}
            onChange={(e) => setTakenOn(e.target.value)}
          />
        </label>

        {/* Das Dateifeld selbst ist versteckt: Browser zeichnen es
            unterschiedlich und keiner davon schön. Der Knopf darüber
            löst es aus. */}
        <input
          ref={dateiFeld}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const datei = e.target.files?.[0];
            if (datei) void aufnehmen(datei);
          }}
        />
        <button
          type="button"
          className="gym-btn"
          disabled={uploading}
          onClick={() => dateiFeld.current?.click()}
        >
          {uploading ? (
            <Spinner size={15} label="Lädt hoch" />
          ) : (
            <>
              <IconPlus size={16} /> {poseLabel(pose)} aufnehmen
            </>
          )}
        </button>

        <p
          style={{
            margin: "10px 0 0",
            fontSize: "var(--pt-fs-sm)",
            lineHeight: 1.5,
            color: "var(--g-dim)",
          }}
        >
          Das Bild wird auf deinem Gerät verkleinert, bevor es hochgeht.
          Aufnahmeort und Gerätedaten bleiben dabei hier.
        </p>
      </div>

      {error && (
        <p style={{ margin: "0 0 14px", fontSize: "var(--pt-fs-md)", color: "var(--g-accent)" }}>
          {error}
        </p>
      )}

      {/* ---------- Vergleich ---------- */}
      {/* ---------- Vergleich ----------
          Dieselbe Komponente wie in der Klientenakte des Trainers und
          auf der Fortschrittsseite. Drei Kopien derselben Logik laufen
          irgendwann auseinander und nennen zu denselben Bildern
          verschiedene Spannen. */}
      {photos.length > 0 && (
        <div className="gym-card" style={{ marginBottom: 18 }}>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "var(--pt-fs-lg)",
              fontWeight: 600,
            }}
          >
            Vorher — Nachher
          </p>
          <PhotoCompare photos={photos} weights={weights} gross />
        </div>
      )}

      {/* ---------- Alle Bilder ---------- */}
      {photos.length > 0 && (
        <>
          <p className="gym-label" style={{ marginBottom: 10 }}>
            Alle Bilder
          </p>
          <div className="gym-grid" style={{ marginBottom: 22 }}>
            {photos.map((p) => (
              <figure key={p.id} className="gym-shot">
                {p.url ? (
                  // Kein next/image: Die Adressen sind signiert und
                  // laufen nach einer Stunde ab — der Bildoptimierer
                  // würde sie zwischenspeichern und danach ins Leere
                  // greifen.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={`${poseLabel(p.pose)}`} loading="lazy" />
                ) : (
                  <div className="cmp__fehlt">nicht ladbar</div>
                )}
                <figcaption>
                  <span>{dateMedium(new Date(p.takenOn))}</span>
                  <span style={{ color: "var(--g-dim)" }}>
                    {poseLabel(p.pose)}
                  </span>
                  <button
                    type="button"
                    onClick={() => loeschen(p.id)}
                    disabled={pending}
                    aria-label="Bild löschen"
                  >
                    <IconX size={14} />
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      )}

      {/* ---------- Widerruf ---------- */}
      <div className="gym-card" style={{ marginBottom: 22 }}>
        <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", fontWeight: 600 }}>
          Einwilligung zurücknehmen
        </p>
        <p
          style={{
            margin: "4px 0 12px",
            fontSize: "var(--pt-fs-base)",
            lineHeight: 1.55,
            color: "var(--g-dim)",
          }}
        >
          {grantedAt && `Erteilt am ${dateMedium(new Date(grantedAt))}. `}
          Dabei werden <strong>alle</strong> deine Bilder gelöscht — nicht
          ausgeblendet, sondern gelöscht. Das lässt sich nicht rückgängig
          machen.
        </p>

        {revoking ? (
          <div style={{ display: "grid", gap: 8 }}>
            <button
              type="button"
              className="gym-btn"
              onClick={widerrufen}
              disabled={pending}
            >
              {pending ? (
                <Spinner size={15} label="Löscht" />
              ) : (
                `Ja, ${photos.length} ${
                  photos.length === 1 ? "Bild" : "Bilder"
                } löschen`
              )}
            </button>
            <button
              type="button"
              className="gym-btn gym-btn--ghost"
              onClick={() => setRevoking(false)}
              disabled={pending}
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="gym-btn gym-btn--ghost"
            onClick={() => setRevoking(true)}
          >
            Zurücknehmen
          </button>
        )}
      </div>
    </>
  );
}
