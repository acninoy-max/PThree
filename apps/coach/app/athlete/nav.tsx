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
  label: string;
  Icon: typeof IconCalendar;
  also?: string[];
}[] = [
  { href: "/athlete", label: "Heute", Icon: IconCalendar },
  {
    href: "/athlete/plan",
    label: "Plan",
    Icon: IconDumbbell,
    also: ["/athlete/log"],
  },
  { href: "/athlete/checkin", label: "Check-in", Icon: IconCheckIn },
  {
    href: "/athlete/progress",
    label: "Fortschritt",
    Icon: IconTrend,
    // Die Fotos hängen am Fortschritt — dort steht der Vergleich, und
    // die Unterseite ist nur zum Verwalten. Ohne diese Zeile wäre
    // während des Hochladens kein Punkt hervorgehoben.
    also: ["/athlete/photos"],
  },
  { href: "/athlete/profile", label: "Profil", Icon: IconClients },
];

export function GymNav() {
  const path = usePathname();

  return (
    <nav className="gym-nav" aria-label="Hauptnavigation">
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
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
