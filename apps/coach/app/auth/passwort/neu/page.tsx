import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { AuthSchale } from "../../schale";
import { NeuesPasswortFormular } from "./neues-passwort-formular";

export const metadata = { title: "Neues Passwort — PTHREE" };

/**
 * Hier landet man NUR ueber die Callback-Route, und die hat vorher eine
 * Sitzung gesetzt. Ohne Sitzung ist der Link abgelaufen, in einem
 * anderen Browser geoeffnet worden oder jemand hat die Adresse geraten.
 *
 * Die Pruefung steht hier und nicht nur in der Middleware: Die
 * Middleware laesst alles unter `/auth` durch, weil der Weg aus der Mail
 * ohne Anmeldung beginnt. Diese eine Seite braucht die Sitzung aber.
 */
export default async function NeuesPasswortPage() {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect("/auth/passwort?fehler=abgelaufen");

  return (
    <AuthSchale
      titel="Neues Passwort"
      unterzeile={`Fuer ${user.email ?? "dein Konto"}.`}
    >
      <NeuesPasswortFormular />
    </AuthSchale>
  );
}
