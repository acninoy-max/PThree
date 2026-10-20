"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/app/i18n/client";

/**
 * Nach „Add client": was jetzt sinnvoll ist, statt eines Pflicht-Dialogs.
 *
 * Bis 20.10.2026 öffnete sich nach dem Anlegen sofort der Plan-Dialog.
 * Im Test wollten Trainer aber oft zuerst das Check-in einrichten oder
 * erst nach dem Erstgespräch planen — der Dialog stand im Weg. Die Karte
 * lässt die Wahl; Platz für „Goal setting" ist vorgesehen.
 *
 * Hängt an `?neu=1` aus createClientAction. „Later" nimmt den Parameter
 * aus der Adresse, damit die Karte beim Neuladen nicht wiederkommt.
 */
export function NaechsteSchritte({
  clientId,
  hasPlan,
}: {
  clientId: string;
  hasPlan: boolean;
}) {
  const t = useT();
  const N = t.coach.nextSteps;
  const router = useRouter();
  const basis = `/coach/clients/${clientId}`;

  return (
    <div className="pt-card" style={{ display: "grid", gap: 12, marginBottom: 18 }}>
      <div>
        <p style={{ margin: 0, fontSize: "var(--pt-fs-lg)", fontWeight: 600 }}>{N.title}</p>
        <p style={{ margin: "3px 0 0", fontSize: "var(--pt-fs-base)", color: "var(--pt-text-dim)" }}>
          {N.body}
        </p>
      </div>
      <div className="pt-naechste">
        <Link href={`${basis}?tab=checkins&einrichten=1`} className="pt-btn pt-btn--ghost">
          {N.checkin}
        </Link>
        {!hasPlan && (
          <Link href={`${basis}?plan=neu`} className="pt-btn pt-btn--ghost">
            {N.plan}
          </Link>
        )}
        <button type="button" className="pt-btn pt-btn--ghost" onClick={() => router.replace(basis)}>
          {t.common.later}
        </button>
      </div>
    </div>
  );
}
