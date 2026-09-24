import Link from "next/link";
import {
  fetchMyCheckIns,
  fetchPhotoConsent,
  fetchProgressPhotos,
} from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { PhotosClient } from "./photos-client";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();

  const { data: me } = await db
    .from("clients")
    .select("id, full_name")
    .eq("profile_id", user?.id ?? "")
    .maybeSingle();

  if (!me) {
    return (
      <main className="gym-shell" style={{ paddingTop: 26 }}>
        <p className="gym-label">Fotos</p>
        <div className="gym-card" style={{ marginTop: 12 }}>
          <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", lineHeight: 1.55 }}>
            Zu diesem Zugang gehört kein Klientenkonto. Melde dich bei
            deinem Trainer.
          </p>
        </div>
      </main>
    );
  }

  const consent = await fetchPhotoConsent(db, me.id);

  // Ohne Einwilligung liefert schon die Zeilensicherheit nichts. Die
  // Abfrage trotzdem zu stellen wäre eine Runde zur Datenbank für ein
  // garantiert leeres Ergebnis.
  const photos = consent ? await fetchProgressPhotos(db, me.id) : [];

  /**
   * Gewicht zu den Aufnahmetagen.
   *
   * Der Vergleich lebt davon: „vor drei Monaten" sagt wenig, „vor drei
   * Monaten, 6,5 kg schwerer" sagt alles. Genommen wird das Check-in,
   * das dem Aufnahmetag am nächsten liegt — der Athlet fotografiert
   * nicht am Meldetag.
   */
  const checkIns = await fetchMyCheckIns(db, 60);
  const gewichte = checkIns
    .filter((c) => c.weightKg !== null)
    .map((c) => ({ on: c.weekOf, kg: c.weightKg as number }));

  return (
    <main className="gym-shell" style={{ paddingTop: 26 }}>
      <Link
        href="/athlete/progress"
        style={{ fontSize: "var(--pt-fs-base)", color: "var(--g-dim)" }}
      >
        ‹ Fortschritt
      </Link>

      <PhotosClient
        clientId={me.id}
        hasConsent={consent !== null}
        grantedAt={consent?.grantedAt ?? null}
        photos={photos}
        weights={gewichte}
      />
    </main>
  );
}
