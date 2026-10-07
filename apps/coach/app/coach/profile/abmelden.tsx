"use client";

import { createClient } from "@/lib/supabase-browser";
import { IconLogout } from "@/app/icons";
import { useT } from "@/app/i18n/client";

export function Abmelden() {
  const t = useT();
  return (
    <button
      type="button"
      className="pt-btn pt-btn--ghost"
      onClick={async () => {
        await createClient().auth.signOut();
        // Harter Wechsel: Die Rollenweiche sitzt in der Middleware.
        window.location.assign("/login");
      }}
    >
      <IconLogout size={16} />
      {t.common.signOut}
    </button>
  );
}
