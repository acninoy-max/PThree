"use server";

import { revalidatePath } from "next/cache";
import { AVATAR_BUCKET } from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";

export type ProfileResult =
  | { ok: true; hinweis?: string }
  | { ok: false; error: string };

async function eigenerKlient() {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { db, user: null, client: null };

  const { data: client } = await db
    .from("clients")
    .select("id, profile_id, avatar_path")
    .eq("profile_id", user.id)
    .maybeSingle();

  return { db, user, client };
}

/**
 * Stammdaten speichern.
 *
 * WAS HIER NICHT PASSIERT: Level, Status, Ziele und die Zuordnung zum
 * Trainer werden nicht angefasst. Nicht, weil diese Funktion sie
 * weglässt — sondern weil der Trigger `clients_self_edit_guard` aus
 * Migration 0021 sie beim Schreiben durch den Athleten auf ihre alten
 * Werte zurücksetzt.
 *
 * Der Unterschied ist wichtig: Eine Prüfung, die nur hier steht, fällt
 * weg, sobald jemand eine zweite Schreibstelle baut oder die API direkt
 * ruft. Die Zeilensicherheit von Postgres entscheidet über Zeilen, nicht
 * über Spalten — deshalb der Trigger.
 */
export async function saveProfileAction(input: {
  fullName: string;
  birthDate: string | null;
  email: string;
}): Promise<ProfileResult> {
  const { db, user, client } = await eigenerKlient();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  if (!client) {
    return { ok: false, error: "Kein Klientenkonto zu diesem Zugang." };
  }

  const name = input.fullName.trim();
  if (name.length < 2) {
    return { ok: false, error: "Bitte trag deinen Namen ein." };
  }

  const email = input.email.trim().toLowerCase();
  if (email !== "" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Diese E-Mail-Adresse sieht nicht gültig aus." };
  }

  const { error } = await db
    .from("clients")
    .update({
      full_name: name,
      birth_date: input.birthDate === "" ? null : input.birthDate,
      email: email === "" ? null : email,
    })
    .eq("id", client.id);

  if (error) {
    if (/birth_date_plausibel/.test(error.message)) {
      return { ok: false, error: "Das Geburtsdatum kann nicht stimmen." };
    }
    return { ok: false, error: error.message };
  }

  /*
    Die Anmeldeadresse ist etwas anderes als die Kontaktadresse.

    `clients.email` ist das, was der Trainer sieht und wohin er
    schreibt. Angemeldet wird man mit der Adresse in `auth.users`, und
    die lässt sich nicht still umstellen: Supabase schickt einen
    Bestätigungslink an die NEUE Adresse, und bis der angeklickt ist,
    gilt die alte weiter.

    Genau das muss dastehen. Wer seine E-Mail ändert und danach mit der
    neuen nicht hereinkommt, hält die App für kaputt.
  */
  let hinweis: string | undefined;
  if (email !== "" && email !== (user.email ?? "").toLowerCase()) {
    const { error: authFehler } = await db.auth.updateUser({ email });
    hinweis = authFehler
      ? "Gespeichert. Deine Anmeldeadresse konnte nicht umgestellt werden — " +
        "melde dich bei deinem Trainer."
      : `Gespeichert. An ${email} ist eine Bestätigungsmail unterwegs. ` +
        "Bis du den Link anklickst, meldest du dich weiter mit deiner alten " +
        "Adresse an.";
  }

  revalidatePath("/athlete/profile");
  revalidatePath("/athlete");
  return hinweis ? { ok: true, hinweis } : { ok: true };
}

/** Ein hochgeladenes Profilbild eintragen. Ersetzt das alte. */
export async function saveAvatarAction(
  storagePath: string,
): Promise<ProfileResult> {
  const { db, user, client } = await eigenerKlient();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  if (!client) {
    return { ok: false, error: "Kein Klientenkonto zu diesem Zugang." };
  }
  if (!storagePath.startsWith(`${client.id}/`)) {
    return { ok: false, error: "Ungültiger Speicherort." };
  }

  const alt = client.avatar_path as string | null;

  const { error } = await db
    .from("clients")
    .update({ avatar_path: storagePath })
    .eq("id", client.id);

  if (error) {
    // Zeile nicht gesetzt, Datei liegt da: aufräumen statt liegen lassen.
    await db.storage.from(AVATAR_BUCKET).remove([storagePath]);
    return { ok: false, error: error.message };
  }

  // Das vorherige Bild wegräumen — sonst sammelt sich im Bucket jedes
  // je hochgeladene Profilbild an, und niemand kommt je darauf zurück.
  if (alt && alt !== storagePath) {
    await db.storage.from(AVATAR_BUCKET).remove([alt]);
  }

  revalidatePath("/athlete/profile");
  revalidatePath("/athlete");
  return { ok: true };
}

/** Profilbild entfernen — Datei und Verweis. */
export async function removeAvatarAction(): Promise<ProfileResult> {
  const { db, user, client } = await eigenerKlient();
  if (!user) return { ok: false, error: "Nicht angemeldet." };
  if (!client) {
    return { ok: false, error: "Kein Klientenkonto zu diesem Zugang." };
  }

  const alt = client.avatar_path as string | null;
  if (!alt) return { ok: true };

  // Erst die Datei, dann der Verweis — dieselbe Reihenfolge wie bei den
  // Fortschrittsfotos. Bricht es dazwischen ab, ist die Datei weg und
  // der Verweis zeigt ins Leere; das ist die harmlose Richtung.
  const { error: speicherFehler } = await db.storage
    .from(AVATAR_BUCKET)
    .remove([alt]);
  if (speicherFehler) return { ok: false, error: speicherFehler.message };

  const { error } = await db
    .from("clients")
    .update({ avatar_path: null })
    .eq("id", client.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/athlete/profile");
  revalidatePath("/athlete");
  return { ok: true };
}
