import type { ProgressPhoto } from "@ptfive/db";
import { PhotoCompare } from "@/app/photo-compare";
import type { WeightPoint } from "@/app/athlete/photos/compare";

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
  return (
    <div style={{ marginBottom: 22 }}>
      <p className="pt-label" style={{ marginBottom: 10 }}>
        Fotos
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
            {clientName} hat der Speicherung von Fotos nicht zugestimmt.
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "var(--pt-fs-sm)",
              lineHeight: 1.55,
              color: "var(--pt-text-dim)",
            }}
          >
            Die Zustimmung kann nur {clientName} selbst geben, in der eigenen
            App unter <em>Fortschritt → Fotos</em>. Du kannst sie nicht für ihn
            erteilen — eine Einwilligung, die ein anderer gibt, ist keine.
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
            Zugestimmt, aber noch kein Bild hochgeladen.
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
            {photos.length} {photos.length === 1 ? "Bild" : "Bilder"} · Nur
            ansehen. Löschen und Zurücknehmen kann nur {clientName} selbst.
          </p>
        </div>
      )}
    </div>
  );
}
