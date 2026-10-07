"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendar,
  IconClients,
  IconFeed,
  IconLibrary,
  IconUser,
} from "@/app/icons";
import { useT } from "@/app/i18n/client";
import type { Dict } from "@/app/i18n";

const LINKS: {
  href: string;
  label: keyof Dict["nav"];
  Icon: typeof IconFeed;
}[] = [
  { href: "/coach", label: "feed", Icon: IconFeed },
  /*
    Tracken und Check-ins standen hier als eigene Punkte. Seit die
    Klientenansicht eigene Reiter dafür hat (Joëls Punkt 13), sind sie
    dort — getrackt wird immer FÜR jemanden. Die Sammelseite der offenen
    Check-ins bleibt über die Karte im Feed erreichbar. So hat die Leiste
    fünf Punkte statt sechs, und der fünfte ist das Profil mit den
    Einstellungen.
  */
  { href: "/coach/clients", label: "clients", Icon: IconClients },
  { href: "/coach/schedule", label: "calendar", Icon: IconCalendar },
  { href: "/coach/training", label: "training", Icon: IconLibrary },
  { href: "/coach/profile", label: "profile", Icon: IconUser },
];

export function Nav({ coachName }: { coachName: string }) {
  const t = useT();
  const path = usePathname();

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

          {/* Der Name führt ins Profil — dort stehen Sprache und
              Abmelden. Vorher lagen beide hier oben und füllten die
              Kopfzeile mit Dingen, die man selten braucht. */}
          <div className="pt-header__right">
            <Link
              href="/coach/profile"
              style={{
                fontSize: "var(--pt-fs-base)",
                color: "var(--pt-text-dim)",
                whiteSpace: "nowrap",
              }}
            >
              {coachName}
            </Link>
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
