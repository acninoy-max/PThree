import type { ProgressPhoto } from "@ptfive/db";
import { PhotoCompare } from "@/app/photo-compare";
import type { WeightPoint } from "@/app/athlete/photos/compare";
import { getT } from "@/app/i18n/server";

/**
 * Fortschrittsfotos in der Klientenakte.
 *
 * NUR ANSEHEN. Kein Hochladen, kein Löschen, kein Widerruf.
 *
 * Das ist keine fehlende Funktion, sondern die Entscheidung aus
 * Migration 0020: Ein Trainer, der Körperfotos seines Klienten selbst
 * ins System legt, ist eine andere Rechtslage. Und eine Einwilligung,
 * die ein anderer erteilt oder zurücknimmt, ist keine. Die
 * Zeilensicherheit setzt das durch — diese Komponente bietet es
 * schlicht gar nicht erst an.
 *
 * Ohne Einwilligung steht hier ein Satz statt einer leeren Fläche. Eine
 * leere Galerie ohne Erklärung führt zu „die App zeigt die Bilder
 * nicht", und das ist eine Fehlersuche, die es nicht geben muss.
 *
 * Der Vergleich selbst steckt in `PhotoCompare` — dieselbe Komponente
 * zeigt ihn dem Athleten auf seiner Fortschrittsseite und auf der
 * Fotoseite. Drei Kopien derselben Logik laufen irgendwann auseinander
 * und nennen zu denselben Bildern verschiedene Spannen.
 */
export function ClientPhotos({
  clientName,
  hasConsent,
  photos,
  weights,
}: {
  clientName: string;
  hasConsent: boolean;
  photos: ProgressPhoto[];
  weights: WeightPoint[];
}) {
  const F = getT().coach.clientPhotos;
  return (
    <div style={{ marginBottom: 22 }}>
      <p className="pt-label" style={{ marginBottom: 10 }}>
        {F.title}
      </p>

      {!hasConsent ? (
        <div className="pt-card">
          <p
            style={{
              margin: 0,
              fontSize: "var(--pt-fs-base)",
              lineHeight: 1.55,
            }}
          >
            {F.noConsent(clientName)}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "var(--pt-fs-sm)",
              lineHeight: 1.55,
              color: "var(--pt-text-dim)",
            }}
          >
            {F.consentOnlySelfBefore(clientName)}
            <em>{F.consentPath}</em>
            {F.consentOnlySelfAfter}
          </p>
        </div>
      ) : photos.length === 0 ? (
        <div className="pt-card">
          <p
            style={{
              margin: 0,
              fontSize: "var(--pt-fs-base)",
              color: "var(--pt-text-dim)",
            }}
          >
            {F.noPhotos}
          </p>
        </div>
      ) : (
        <div className="pt-card">
          <PhotoCompare photos={photos} weights={weights} />

          <p
            style={{
              margin: "12px 0 0",
              fontSize: "var(--pt-fs-sm)",
              lineHeight: 1.5,
              color: "var(--pt-text-dim)",
            }}
          >
            {F.viewOnly(photos.length, clientName)}
          </p>
        </div>
      )}
    </div>
  );
}
