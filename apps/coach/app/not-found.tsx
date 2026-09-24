import Link from "next/link";
import { Fehlerkarte } from "./fehlerkarte";

export const metadata = { title: "Seite nicht gefunden — PTHREE" };

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
  return (
    <Fehlerkarte
      titel="Diese Seite gibt es nicht"
      text={
        <>
          Die Adresse stimmt nicht — vertippt, oder der Link ist nicht mehr
          gültig. Einladungslinks laufen nach 14 Tagen ab und funktionieren
          nur einmal; frag in dem Fall deinen Trainer nach einem neuen.
        </>
      }
    >
      <Link
        href="/"
        className="pt-btn"
        style={{ marginTop: 16, textDecoration: "none" }}
      >
        Zurück zur App
      </Link>
    </Fehlerkarte>
  );
}
