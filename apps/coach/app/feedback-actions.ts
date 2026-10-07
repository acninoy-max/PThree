"use server";

import { headers } from "next/headers";
import { createServerSupabase } from "@/lib/supabase-server";
import { getLocale, getT } from "@/app/i18n/server";

export type FeedbackResult = { ok: true } | { ok: false; error: string };

/**
 * Freitext-Feedback speichern (Tabelle aus 0027).
 *
 * Mit `.select("id").single()` statt nur `insert`: Ohne Rückgabe hieße
 * eine verweigerte Zeile „hat geklappt" — und der Tester glaubt, sein
 * Hinweis sei angekommen. Regel 3.
 */
export async function sendFeedbackAction(message: string): Promise<FeedbackResult> {
  const t = getT();
  const text = message.trim();
  if (text === "") return { ok: false, error: t.feedback.empty };
  if (text.length > 4000) return { ok: false, error: t.feedback.tooLong };

  const db = createServerSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: t.fehler.action.notSignedIn };

  const { data, error } = await db
    .from("app_feedback")
    .insert({
      user_id: user.id,
      message: text,
      locale: getLocale(),
      // Welches Gerät — hilft beim Nachstellen („auf dem iPhone springt …").
      user_agent: headers().get("user-agent")?.slice(0, 300) ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (/schema cache|does not exist/i.test(error.message)) {
      return { ok: false, error: t.feedback.notReady };
    }
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: t.feedback.notSaved };
  return { ok: true };
}
