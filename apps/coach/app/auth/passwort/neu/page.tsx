import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { AuthSchale } from "../../schale";
import { NeuesPasswortFormular } from "./neues-passwort-formular";

import { getT } from "@/app/i18n/server";

export function generateMetadata() {
  return { title: getT().auth.newPassword.metaTitle };
}

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

  const t = getT();
  return (
    <AuthSchale
      titel={t.auth.newPassword.title}
      unterzeile={t.auth.newPassword.forAccount(user.email ?? null)}
    >
      <NeuesPasswortFormular />
    </AuthSchale>
  );
}
