import { AVATAR_BUCKET } from "@ptfive/db";
import { createServerSupabase } from "@/lib/supabase-server";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();

  const { data: me } = await db
    .from("clients")
    .select("id, full_name, email, birth_date, avatar_path, started_on")
    .eq("profile_id", user?.id ?? "")
    .maybeSingle();

  if (!me) {
    return (
      <main className="gym-shell" style={{ paddingTop: 26 }}>
        <p className="gym-label">Profil</p>
        <div className="gym-card" style={{ marginTop: 12 }}>
          <p style={{ margin: 0, fontSize: "var(--pt-fs-md)", lineHeight: 1.55 }}>
            Zu diesem Zugang gehört kein Klientenkonto. Melde dich bei
            deinem Trainer.
          </p>
        </div>
      </main>
    );
  }

  /*
    Der Bucket ist privat, also ein signierter Link. Acht Stunden statt
    einer: Ein Profilbild sieht man beiläufig und oft, und ein Bild, das
    nach einer Stunde grau wird, wirkt wie ein Fehler.
  */
  let avatarUrl: string | null = null;
  if (me.avatar_path) {
    const { data } = await db.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(me.avatar_path as string, 60 * 60 * 8);
    avatarUrl = data?.signedUrl ?? null;
  }

  return (
    <main className="gym-shell" style={{ paddingTop: 26 }}>
      <ProfileForm
        clientId={me.id as string}
        fullName={(me.full_name as string) ?? ""}
        email={(me.email as string | null) ?? ""}
        birthDate={(me.birth_date as string | null) ?? ""}
        avatarUrl={avatarUrl}
        hasAvatar={Boolean(me.avatar_path)}
        /* Die Adresse, mit der man sich TATSÄCHLICH anmeldet. Kann von
           der Kontaktadresse abweichen — siehe saveProfileAction. */
        loginEmail={user?.email ?? null}
        startedOn={(me.started_on as string) ?? null}
      />
    </main>
  );
}
