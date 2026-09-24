/**
 * Startanimation.
 *
 * Liegt im Wurzel-Layout und steht damit im allerersten HTML, das der
 * Browser bekommt — sie deckt genau den Moment ab, in dem sonst ein
 * leerer Schirm stünde.
 *
 * ZWEI ENTSCHEIDUNGEN, DIE ZUSAMMENGEHÖREN
 *
 * **Kein JavaScript.** Die Animation läuft rein über CSS und endet über
 * `animation-fill-mode: forwards` von selbst. Eine Startanimation, die
 * per JavaScript wieder ausgeblendet wird, bleibt für immer stehen,
 * sobald das Skript einen Fehler hat oder gar nicht erst ankommt — und
 * dann ist die App nicht kaputt, sondern unerreichbar. Das ist der
 * schlimmste Fehler, den ein Startbild machen kann, und er ist hier
 * ausgeschlossen: Ohne JavaScript läuft sie trotzdem ab.
 *
 * **Keine Server-Komponente mit Zustand.** Das Wurzel-Layout bleibt bei
 * Navigationen im Browser bestehen, also wird dieses Element genau
 * einmal je echtem Seitenaufruf gezeichnet. Beim Tippen auf einen
 * Menüpunkt passiert nichts mehr — die Animation ist dann längst
 * abgelaufen und unsichtbar.
 *
 * Die Bewegung selbst: Die Marke wird von links nach rechts
 * aufgedeckt, eine schmale rote Kante läuft der Aufdeckung voraus. Das
 * ist dieselbe Farbe wie im Logo, und es dauert knapp eine Sekunde.
 */
export function Splash() {
  return (
    <div className="pt-splash" aria-hidden>
      <div className="pt-splash__mark">
        {/*
          Bewusst kein `next/image`: Das Startbild muss beim allerersten
          Zeichnen da sein. Der Bildoptimierer schiebt eine zusätzliche
          Anfrage dazwischen, und die Hülle, die er erzeugt, macht die
          Aufdeck-Maske unnötig kompliziert.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pt3-wordmark.png"
          alt=""
          width={252}
          height={160}
          fetchPriority="high"
        />
      </div>
    </div>
  );
}
