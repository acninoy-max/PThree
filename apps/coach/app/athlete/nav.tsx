"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendar,
  IconCheckIn,
  IconClients,
  IconDumbbell,
  IconTrend,
} from "@/app/icons";
import { useT } from "@/app/i18n/client";
import type { Dict } from "@/app/i18n";

/**
 * Die Leiste unten.
 *
 * „Plan" und nicht „Training": Von dort aus sieht der Athlet seine
 * Woche und startet die Einheit. Das Loggen selbst ist eine Unterseite
 * und braucht keinen eigenen Knopf.
 *
 * ABMELDEN STAND HIER FRÜHER ALS FÜNFTER PUNKT — daneben. Es ist keine
 * Schwester von Heute, Plan, Check-in und Fortschritt: Man tut es
 * selten, und es beendet alles. Jetzt liegt es im Profil, wo man es
 * sucht, und der freigewordene Platz gehört einem Punkt, den man
 * wirklich braucht.
 */
const LINKS: {
  href: string;
  label: keyof Dict["nav"];
  Icon: typeof IconCalendar;
  also?: string[];
}[] = [
  { href: "/athlete", label: "today", Icon: IconCalendar },
  {
    href: "/athlete/plan",
    label: "plan",
    Icon: IconDumbbell,
    also: ["/athlete/log"],
  },
  { href: "/athlete/checkin", label: "checkin", Icon: IconCheckIn },
  {
    href: "/athlete/progress",
    label: "progress",
    Icon: IconTrend,
    // Die Fotos hängen am Fortschritt — dort steht der Vergleich, und
    // die Unterseite ist nur zum Verwalten. Ohne diese Zeile wäre
    // während des Hochladens kein Punkt hervorgehoben.
    also: ["/athlete/photos"],
  },
  { href: "/athlete/profile", label: "profile", Icon: IconClients },
];

export function GymNav() {
  const t = useT();
  const path = usePathname();

  return (
    <nav className="gym-nav" aria-label={t.nav.main}>
      {LINKS.map(({ href, label, Icon, also }) => {
        const active =
          href === "/athlete"
            ? path === "/athlete"
            : path.startsWith(href) ||
              (also ?? []).some((p) => path.startsWith(p));
        return (
          <Link
            key={href}
            href={href}
            data-active={active}
            aria-current={active ? "page" : undefined}
          >
            {/* Drei Merkmale für den aktiven Punkt — Balken, Pille,
                dunklere Schrift. Keines davon trägt allein, siehe
                gym.css. */}
            <span className="gym-nav__icon">
              <Icon size={21} filled={active} strokeWidth={active ? 2 : 1.8} />
            </span>
            <span>{t.nav[label]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
