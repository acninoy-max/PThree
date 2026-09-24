/**
 * Bild im Browser verkleinern, bevor es hochgeladen wird.
 *
 * Drei Gründe, und der dritte ist der wichtigste.
 *
 * 1. **Größe.** Ein Foto vom iPhone hat 3 bis 5 MB. Zwölf Monate mit
 *    drei Ansichten sind 150 MB für einen einzigen Klienten — und jeder
 *    Aufruf der Galerie lädt sie über Mobilfunk. 1400px lange Kante bei
 *    Qualität 0,82 landet bei 150 bis 300 kB und sieht auf jedem Handy
 *    gleich aus.
 *
 * 2. **Zeit.** Im Studio hat niemand Lust, 40 Sekunden auf einen Upload
 *    zu warten.
 *
 * 3. **EXIF — und damit GPS.** Ein Handyfoto trägt Aufnahmeort, Gerät
 *    und Zeitpunkt im Bild. Bei einem Körperfoto, das zu Hause
 *    entstanden ist, sind das die Koordinaten der Wohnung. Wer das Bild
 *    unverändert speichert, speichert die Adresse mit.
 *
 *    Der Umweg über die Leinwand löst das nebenbei: Herausgezeichnet
 *    werden nur die Bildpunkte. Alle Metadaten bleiben zurück.
 *
 * ZUR DREHUNG
 *
 * Genau deshalb ist die Reihenfolge heikel. Die Drehung eines
 * Handyfotos steht AUCH nur im EXIF — hochkant aufgenommene Bilder sind
 * in der Datei quer und werden erst beim Anzeigen gedreht. Zeichnet man
 * die rohen Bildpunkte auf die Leinwand und wirft das EXIF weg, liegt
 * das Bild hinterher auf der Seite.
 *
 * Ein `<img>`-Element wendet die Drehung von sich aus an (CSS
 * `image-orientation: from-image` ist seit Jahren die Voreinstellung),
 * und `drawImage` übernimmt genau das, was das Element zeigt. Also:
 * über ein Bildelement laden, nicht über den rohen Datenstrom.
 */

export interface ShrunkImage {
  blob: Blob;
  width: number;
  height: number;
}

/** Längste Kante. Reicht für jedes Handydisplay und für den Vergleich. */
export const MAX_KANTE = 1400;

/** Kompromiss zwischen Größe und Haut: Darunter wird es fleckig. */
const QUALITAET = 0.82;

export async function shrinkImage(
  datei: File,
  maxKante = MAX_KANTE,
): Promise<ShrunkImage> {
  const url = URL.createObjectURL(datei);

  try {
    const bild = await laden(url);

    const faktor = Math.min(1, maxKante / Math.max(bild.width, bild.height));
    const breite = Math.max(1, Math.round(bild.width * faktor));
    const hoehe = Math.max(1, Math.round(bild.height * faktor));

    const leinwand = document.createElement("canvas");
    leinwand.width = breite;
    leinwand.height = hoehe;

    const stift = leinwand.getContext("2d");
    if (!stift) throw new Error("Bild konnte nicht verarbeitet werden.");

    // Glättung auf hoch: Ohne sie franst starkes Verkleinern aus.
    stift.imageSmoothingEnabled = true;
    stift.imageSmoothingQuality = "high";
    stift.drawImage(bild, 0, 0, breite, hoehe);

    const blob = await new Promise<Blob | null>((fertig) =>
      leinwand.toBlob(fertig, "image/jpeg", QUALITAET),
    );
    if (!blob) throw new Error("Bild konnte nicht gespeichert werden.");

    return { blob, width: breite, height: hoehe };
  } finally {
    // Auch im Fehlerfall: Ein nicht freigegebener Objekt-Link hält das
    // ganze Bild im Speicher, bis die Seite neu lädt.
    URL.revokeObjectURL(url);
  }
}

function laden(url: string): Promise<HTMLImageElement> {
  return new Promise((fertig, fehler) => {
    const bild = new Image();
    bild.onload = () => fertig(bild);
    bild.onerror = () =>
      fehler(new Error("Die Datei konnte nicht als Bild gelesen werden."));
    bild.src = url;
  });
}

/**
 * Dateiname im Speicher.
 *
 * Zufällig und ohne Bezug zum Inhalt. Ein sprechender Name wie
 * „2026-09-23-front.jpg" wäre ratbar — und bei einem privaten Bucket
 * ist der Pfad die letzte Hürde, wenn an den Regeln je etwas verrutscht.
 * Die Zuordnung steht ohnehin in der Datenbank.
 */
export function photoFileName(): string {
  const zufall =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${zufall}.jpg`;
}
