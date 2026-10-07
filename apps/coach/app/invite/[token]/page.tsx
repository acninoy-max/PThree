import Image from "next/image";
import { createServerSupabase } from "@/lib/supabase-server";
import { AcceptInvite } from "./accept";
import { getT } from "@/app/i18n/server";

export const dynamic = "force-dynamic";

interface InvitePeek {
  client_name: string;
  coach_name: string;
  /** Die vom Trainer hinterlegte Adresse. Kann fehlen — Altbestand. */
  client_email: string | null;
  is_valid: boolean;
  bereits_verknuepft: boolean;
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
  const t = getT();

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
            <p style={{ margin: 0, fontWeight: 500 }}>{t.auth.invite.invalidTitle}</p>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "var(--pt-fs-base)",
                color: "var(--pt-text-dim)",
                lineHeight: 1.5,
              }}
            >
              {t.auth.invite.invalidBody}
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
              {t.auth.invite.invitedBy}{" "}
              {invite.bereits_verknuepft
                ? t.auth.invite.alreadyLinked
                : t.auth.invite.choosePassword}
            </p>
            <AcceptInvite
              token={params.token}
              clientName={invite.client_name}
              vorgabeEmail={invite.client_email}
              bereitsVerknuepft={invite.bereits_verknuepft}
            />
          </>
        )}
      </div>
    </main>
  );
}
