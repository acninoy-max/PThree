"use server";

import { revalidatePath } from "next/cache";
import { PHOTO_BUCKET, type PhotoPose } from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { CONSENT_VERSION } from "./consent-text";

export type PhotoResult = { ok: true } | { ok: false; error: string };

/**
 * Den eigenen Klientensatz holen.
 *
 * Alles hier hängt daran, dass der Handelnde der Athlet selbst ist —
 * nicht sein Trainer. Die Zeilensicherheit erzwingt das ohnehin; diese
 * Prüfung liefert nur eine Meldung, die etwas sagt, statt eines
 * Policy-Fehlers.
 */
async function eigenerKlient() {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { db, user: null, client: null };

  const { data: client } = await db
    .from("clients")
    .select("id, profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  return { db, user, client };
}

/**
 * Einwilligung erteilen.
 *
 * Erst danach lässt die Datenbank einen Upload zu — nicht, weil die
 * Oberfläche das Formular versteckt, sondern weil `has_photo_consent()`
 * in der Schreibregel steht.
 */
export async function grantPhotoConsentAction(): Promise<PhotoResult> {
  const { db, user, client } = await eigenerKlient();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  if (!client) {
    return { ok: false, error: "Kein Klientenkonto zu diesem Zugang." };
  }

  // Schon eine offene Einwilligung? Dann ist nichts zu tun. Der
  // eindeutige Teilindex würde sonst mit einer technischen Meldung
  // abbrechen, die niemandem hilft.
  const { data: vorhanden } = await db
    .from("photo_consents")
    .select("id")
    .eq("client_id", client.id)
    .is("revoked_at", null)
    .maybeSingle();
  if (vorhanden) return { ok: true };

  const { error } = await db.from("photo_consents").insert({
    client_id: client.id,
    granted_by: user.id,
    text_version: CONSENT_VERSION,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/athlete/photos");
  return { ok: true };
}

/**
 * Einwilligung widerrufen — und alles löschen.
 *
 * DIE REIHENFOLGE IST DER GANZE PUNKT.
 *
 * Erst die Dateien im Speicher, dann der Eintrag des Widerrufs. Der
 * Trigger `photo_consents_purge` räumt beim Widerruf die Zeilen weg,
 * aber Postgres erreicht den Bucket nicht — die Dateien muss diese
 * Funktion löschen.
 *
 * Bricht es zwischendrin ab, ist der Zustand: Dateien weg, Einwilligung
 * steht noch. Unschön, aber die harmlose Richtung. Andersherum — Widerruf
 * eingetragen, Bilder liegen weiter im Speicher — wäre genau der
 * Zustand, den ein Widerruf beenden soll. Ein zweiter Versuch räumt den
 * Rest auf; die Funktion ist wiederholbar.
 */
export async function revokePhotoConsentAction(): Promise<PhotoResult> {
  const { db, user, client } = await eigenerKlient();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  if (!client) {
    return { ok: false, error: "Kein Klientenkonto zu diesem Zugang." };
  }

  const { data: consent } = await db
    .from("photo_consents")
    .select("id")
    .eq("client_id", client.id)
    .is("revoked_at", null)
    .maybeSingle();
  if (!consent) return { ok: true }; // Nichts zu widerrufen.

  // 1. Dateien. Die Pfade stehen in den Zeilen, die der Trigger gleich
  //    löschen wird — also VOR dem Widerruf lesen.
  const { data: zeilen, error: leseFehler } = await db
    .from("progress_photos")
    .select("storage_path")
    .eq("client_id", client.id);
  if (leseFehler) return { ok: false, error: leseFehler.message };

  const pfade = (zeilen ?? []).map((r) => r.storage_path as string);
  if (pfade.length > 0) {
    const { error: speicherFehler } = await db.storage
      .from(PHOTO_BUCKET)
      .remove(pfade);
    if (speicherFehler) {
      return {
        ok: false,
        error:
          "Die Bilder konnten nicht gelöscht werden — der Widerruf wurde " +
          "deshalb nicht eingetragen. Bitte noch einmal versuchen.",
      };
    }
  }

  // 2. Widerruf eintragen. Der Trigger löscht die Zeilen.
  const { error } = await db
    .from("photo_consents")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", consent.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/athlete/photos");
  revalidatePath("/athlete/progress");
  return { ok: true };
}

/**
 * Ein hochgeladenes Bild eintragen.
 *
 * Die Datei liegt zu diesem Zeitpunkt schon im Speicher — hochgeladen
 * hat sie der Browser direkt, mit der Anmeldung des Athleten. Ein Umweg
 * über den Server hieße, ein paar Megabyte zweimal zu schicken, nur
 * damit dieselben Regeln greifen, die für den Browser ohnehin gelten.
 */
export async function savePhotoAction(input: {
  storagePath: string;
  pose: PhotoPose;
  takenOn: string;
  width: number;
  height: number;
  bytes: number;
}): Promise<PhotoResult> {
  const { db, user, client } = await eigenerKlient();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  if (!client) {
    return { ok: false, error: "Kein Klientenkonto zu diesem Zugang." };
  }

  // Der Pfad muss im eigenen Ordner liegen. Die Datenbank prüft das
  // auch (`progress_photos_pfad_passt`), aber hier lässt sich eine
  // verirrte Datei noch aufräumen statt nur abzulehnen.
  if (!input.storagePath.startsWith(`${client.id}/`)) {
    return { ok: false, error: "Ungültiger Speicherort." };
  }

  const { error } = await db.from("progress_photos").insert({
    client_id: client.id,
    storage_path: input.storagePath,
    pose: input.pose,
    taken_on: input.takenOn,
    width: Math.round(input.width),
    height: Math.round(input.height),
    bytes: Math.round(input.bytes),
    uploaded_by: user.id,
  });

  if (error) {
    // Die Zeile fehlt, die Datei liegt da: eine Waise. Aufräumen, statt
    // sie liegen zu lassen — sonst sammelt sich im Bucket an, was
    // nirgends auftaucht und niemand löscht.
    await db.storage.from(PHOTO_BUCKET).remove([input.storagePath]);
    return { ok: false, error: error.message };
  }

  revalidatePath("/athlete/photos");
  return { ok: true };
}

/** Ein einzelnes Bild löschen — Datei und Zeile. */
export async function deletePhotoAction(id: string): Promise<PhotoResult> {
  const { db, user, client } = await eigenerKlient();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  if (!client) {
    return { ok: false, error: "Kein Klientenkonto zu diesem Zugang." };
  }

  const { data: foto } = await db
    .from("progress_photos")
    .select("id, storage_path")
    .eq("id", id)
    .eq("client_id", client.id)
    .maybeSingle();
  if (!foto) return { ok: false, error: "Bild nicht gefunden." };

  // Erst die Datei, dann die Zeile — dieselbe Reihenfolge und derselbe
  // Grund wie beim Widerruf.
  const { error: speicherFehler } = await db.storage
    .from(PHOTO_BUCKET)
    .remove([foto.storage_path as string]);
  if (speicherFehler) return { ok: false, error: speicherFehler.message };

  const { error } = await db.from("progress_photos").delete().eq("id", foto.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/athlete/photos");
  return { ok: true };
}
