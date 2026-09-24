"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import {
  IconCalendar,
  IconCheckIn,
  IconClients,
  IconDumbbell,
  IconFeed,
  IconLibrary,
  IconLogout,
} from "@/app/icons";

const LINKS = [
  { href: "/coach", label: "Feed", Icon: IconFeed },
  { href: "/coach/clients", label: "Klienten", Icon: IconClients },
  { href: "/coach/track", label: "Tracken", Icon: IconDumbbell },
  { href: "/coach/schedule", label: "Kalender", Icon: IconCalendar },
  { href: "/coach/checkins", label: "Check-ins", Icon: IconCheckIn },
  // Eigenes Symbol, nicht noch einmal die Hantel: „Tracken" und
  // „Übungen" trugen dieselbe, und zwei Nachbarn mit demselben
  // Zeichen heben die Unterscheidung auf, für die Zeichen da sind.
  { href: "/coach/exercises", label: "Übungen", Icon: IconLibrary },
];

export function Nav({ coachName }: { coachName: string }) {
  const path = usePathname();

  async function signOut() {
    await createClient().auth.signOut();
    window.location.assign("/login");
  }

  return (
    <>
      <header className="pt-header">
        <div className="pt-shell pt-header__inner">
          <Link
            href="/coach"
            aria-label="PTHREE — zur Startseite"
            style={{ display: "flex", flex: "none" }}
          >
            <Image
              src="/pt3-wordmark.png"
              alt="PTHREE"
              width={252}
              height={160}
              priority
              style={{ height: 34, width: "auto" }}
            />
          </Link>

          {/* Klasse statt Inline-Style: Ein `style`-Attribut schlaegt
              jede Regel aus dem Stylesheet, egal wie spezifisch. Genau
              daran ist das Ausblenden auf dem Handy gescheitert. */}
          <nav className="pt-headernav" aria-label="Hauptnavigation">
            {LINKS.map(({ href, label, Icon }) => {
              // "/coach" ist Präfix aller Unterseiten — daher exakter Vergleich.
              const active =
                href === "/coach" ? path === "/coach" : path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="pt-navlink"
                  data-active={active}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    size={17}
                    filled={active}
                    strokeWidth={active ? 2 : 1.8}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-header__right">
            <span
              style={{
                fontSize: "var(--pt-fs-base)",
                color: "var(--pt-text-dim)",
                whiteSpace: "nowrap",
              }}
            >
              {coachName}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="pt-iconbtn"
              aria-label="Abmelden"
              title="Abmelden"
            >
              <IconLogout size={18} />
            </button>
          </div>
        </div>
      </header>

      {/*
        Zweite Navigation für schmale Geräte.

        Nicht dieselbe Leiste kleiner gerechnet, sondern die Form, die auf
        ein Handy gehört: unten, in Daumenreichweite, gleich breite
        Felder. Die Kopfzeile blendet unter 640px ihre Links aus und
        behält nur Marke und Abmelden — genau das, was der Screenshot
        zeigte: eine waagerecht wegscrollende Leiste ist keine
        Navigation, sondern ein Suchspiel.

        Beide stehen im Markup, sichtbar ist über CSS immer nur eine. Das
        ist ein paar Bytes teurer als eine Umschaltung in JavaScript —
        dafür gibt es kein Flackern beim Laden und keine Abhängigkeit von
        einer Bildschirmbreite, die der Server nicht kennt.
      */}
      <nav className="pt-tabbar" aria-label="Hauptnavigation">
        {LINKS.map(({ href, label, Icon }) => {
          const active =
            href === "/coach" ? path === "/coach" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              data-active={active}
              aria-current={active ? "page" : undefined}
            >
              <span className="pt-tabbar__icon">
                <Icon
                  size={19}
                  filled={active}
                  strokeWidth={active ? 2 : 1.8}
                />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
