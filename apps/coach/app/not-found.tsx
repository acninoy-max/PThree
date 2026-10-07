import Link from "next/link";
import { Fehlerkarte } from "./fehlerkarte";
import { getT } from "./i18n/server";

export function generateMetadata() {
  return { title: getT().fehler.notFound.metaTitle };
}

/**
 * 404.
 *
 * Kein "Oops" und kein Witz. Wer hier landet, hat sich vertippt oder
 * einen Link erwischt, der nicht mehr gilt — meistens einen abgelaufenen
 * Einladungslink. Der Hinweis darauf ist nuetzlicher als jede
 * Entschuldigung.
 *
 * `/` statt einer festen Adresse: Die Rollenweiche dort schickt den
 * Trainer nach /coach und den Athleten nach /athlete. Wer nicht
 * angemeldet ist, landet auf /login. Ein Knopf, drei richtige Ziele.
 */
export default function NotFound() {
  const t = getT();
  return (
    <Fehlerkarte titel={t.fehler.notFound.title} text={t.fehler.notFound.body}>
      <Link
        href="/"
        className="pt-btn"
        style={{ marginTop: 16, textDecoration: "none" }}
      >
        {t.fehler.notFound.back}
      </Link>
    </Fehlerkarte>
  );
}
