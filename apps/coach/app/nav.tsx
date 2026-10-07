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
import { useT } from "@/app/i18n/client";
import { Sprachwahl } from "@/app/i18n/sprachwahl";
import type { Dict } from "@/app/i18n";

const LINKS: {
  href: string;
  label: keyof Dict["nav"];
  Icon: typeof IconFeed;
}[] = [
  { href: "/coach", label: "feed", Icon: IconFeed },
  { href: "/coach/clients", label: "clients", Icon: IconClients },
  { href: "/coach/track", label: "track", Icon: IconDumbbell },
  { href: "/coach/schedule", label: "calendar", Icon: IconCalendar },
  { href: "/coach/checkins", label: "checkins", Icon: IconCheckIn },
  // Eigenes Symbol, nicht noch einmal die Hantel: „Tracken" und
  // „Übungen" trugen dieselbe, und zwei Nachbarn mit demselben
  // Zeichen heben die Unterscheidung auf, für die Zeichen da sind.
  { href: "/coach/exercises", label: "exercises", Icon: IconLibrary },
];

export function Nav({ coachName }: { coachName: string }) {
  const t = useT();
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
            aria-label={t.common.toHome}
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
          <nav className="pt-headernav" aria-label={t.nav.main}>
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
                  <span>{t.nav[label]}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-header__right">
            <Sprachwahl kurz />
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
              aria-label={t.common.signOut}
              title={t.common.signOut}
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
      <nav className="pt-tabbar" aria-label={t.nav.main}>
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
              <span>{t.nav[label]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
