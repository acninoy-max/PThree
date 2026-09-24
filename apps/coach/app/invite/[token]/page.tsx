import Image from "next/image";
import { createServerSupabase } from "@/lib/supabase-server";
import { AcceptInvite } from "./accept";

export const dynamic = "force-dynamic";

interface InvitePeek {
  client_name: string;
  coach_name: string;
  is_valid: boolean;
}

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const db = createServerSupabase();
  const { data } = await db.rpc("peek_client_invite", {
    invite_token: params.token,
  });

  const invite = (data as InvitePeek[] | null)?.[0] ?? null;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <Image
          src="/pt3-wordmark.png"
          alt="PTHREE"
          width={252}
          height={160}
          priority
          style={{ height: 56, width: "auto" }}
        />

        {!invite || !invite.is_valid ? (
          <div className="pt-card" style={{ marginTop: 22 }}>
            <p style={{ margin: 0, fontWeight: 500 }}>Einladung ungültig</p>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "var(--pt-fs-base)",
                color: "var(--pt-text-dim)",
                lineHeight: 1.5,
              }}
            >
              Der Link ist abgelaufen oder wurde bereits verwendet. Bitte frag
              deinen Coach nach einem neuen.
            </p>
          </div>
        ) : (
          <>
            <p
              style={{
                margin: "14px 0 22px",
                fontSize: "var(--pt-fs-md)",
                color: "var(--pt-text-dim)",
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: "var(--pt-text)" }}>
                {invite.coach_name}
              </strong>{" "}
              hat dich eingeladen. Leg dein Konto an, dann siehst du deine
              Pläne, Termine und Fortschritte.
            </p>
            <AcceptInvite
              token={params.token}
              clientName={invite.client_name}
            />
          </>
        )}
      </div>
    </main>
  );
}
