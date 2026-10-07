"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PHOTO_BUCKET, type ProgressPhoto } from "@ptfive/db";
import { createClient } from "@/lib/supabase-browser";
import { IconPlus, IconX } from "@/app/icons";
import { Spinner } from "@/app/spinner";
import { toast } from "@/app/toast";
import { useLocale, useT } from "@/app/i18n/client";
import { CONSENT } from "@/app/i18n/einwilligung";
import { POSES, type Pose, type WeightPoint } from "./compare";
import { BildFehler, photoFileName, shrinkImage } from "./shrink";
import { PhotoCompare } from "@/app/photo-compare";
import {
  deletePhotoAction,
  grantPhotoConsentAction,
  revokePhotoConsentAction,
  savePhotoAction,
} from "./actions";

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
  const t = useT();
  const text = CONSENT[useLocale()];
  return (
    <>
      <p className="gym-label" style={{ marginTop: 14 }}>
        {t.athlete.photos.area}
      </p>
      <h1 style={{ margin: "3px 0 14px", fontSize: "var(--pt-fs-2xl)", fontWeight: 700 }}>
        {text.title}
      </h1>

      <div className="gym-card" style={{ display: "grid", gap: 16 }}>
        {text.points.map((p) => (
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
        {text.summary}
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
        {pending ? (
          <Spinner size={15} label={t.athlete.photos.moment} />
        ) : (
          t.athlete.photos.agree
        )}
      </button>

      <p
        style={{
          margin: "12px 0 0",
          fontSize: "var(--pt-fs-sm)",
          lineHeight: 1.5,
          color: "var(--g-dim)",
        }}
      >
        {t.athlete.photos.noChange}
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
  const t = useT();
  const f = t.athlete.photos;
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
        setError(f.uploadFailed(hochFehler.message));
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
      toast(f.saved);
      onChanged();
    } catch (e) {
      setError(
        e instanceof BildFehler
          ? f.shrink[e.grund]
          : e instanceof Error
            ? e.message
            : f.unknownError,
      );
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
        toast(f.deleted);
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
        {f.area}
      </p>
      <h1 style={{ margin: "3px 0 4px", fontSize: "var(--pt-fs-2xl)", fontWeight: 700 }}>
        {f.count(photos.length)}
      </h1>
      <p style={{ margin: "0 0 18px", fontSize: "var(--pt-fs-base)", color: "var(--g-dim)" }}>
        {f.onlyYou}
      </p>

      {/* ---------- Aufnehmen ---------- */}
      <div className="gym-card" style={{ marginBottom: 18 }}>
        <p style={{ margin: "0 0 12px", fontSize: "var(--pt-fs-lg)", fontWeight: 600 }}>
          {f.newPhoto}
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
              {t.labels.pose[p.key]}
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
          <span className="gym-label">{f.takenOn}</span>
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
            <Spinner size={15} label={f.uploading} />
          ) : (
            <>
              <IconPlus size={16} /> {f.capture(t.labels.pose[pose])}
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
          {f.shrinkHint}
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
            {t.athlete.progress.beforeAfter}
          </p>
          <PhotoCompare photos={photos} weights={weights} gross />
        </div>
      )}

      {/* ---------- Alle Bilder ---------- */}
      {photos.length > 0 && (
        <>
          <p className="gym-label" style={{ marginBottom: 10 }}>
            {f.allPhotos}
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
                  <img src={p.url} alt={t.labels.pose[p.pose]} loading="lazy" />
                ) : (
                  <div className="cmp__fehlt">{t.compare.notLoadable}</div>
                )}
                <figcaption>
                  <span>{t.fmt.dateMedium(new Date(p.takenOn))}</span>
                  <span style={{ color: "var(--g-dim)" }}>
                    {t.labels.pose[p.pose]}
                  </span>
                  <button
                    type="button"
                    onClick={() => loeschen(p.id)}
                    disabled={pending}
                    aria-label={f.deletePhoto}
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
          {f.revokeTitle}
        </p>
        <p
          style={{
            margin: "4px 0 12px",
            fontSize: "var(--pt-fs-base)",
            lineHeight: 1.55,
            color: "var(--g-dim)",
          }}
        >
          {grantedAt && f.grantedOn(t.fmt.dateMedium(new Date(grantedAt)))}
          {f.revokeBefore}
          <strong>{f.revokeAll}</strong>
          {f.revokeAfter}
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
                <Spinner size={15} label={f.deleting} />
              ) : (
                f.confirmDelete(photos.length)
              )}
            </button>
            <button
              type="button"
              className="gym-btn gym-btn--ghost"
              onClick={() => setRevoking(false)}
              disabled={pending}
            >
              {t.common.cancel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="gym-btn gym-btn--ghost"
            onClick={() => setRevoking(true)}
          >
            {f.revoke}
          </button>
        )}
      </div>
    </>
  );
}
