"use client";

import { useEffect, useState } from "react";

/**
 * Kurze Bestätigungen.
 *
 * Bisher passierte nach dem Speichern: nichts Sichtbares. Die Seite lud
 * still neu, und der Nutzer stand davor und fragte sich, ob der Tipp
 * angekommen war. Im Zweifel tippt man ein zweites Mal — und legt den
 * Termin doppelt an.
 *
 * DREI ENTSCHEIDUNGEN
 *
 * 1. **Über ein Fensterereignis, nicht über einen Context.** Die halbe
 *    App besteht aus Server-Komponenten; ein Context-Provider müsste
 *    durch jede Grenze durchgereicht werden. Ein Ereignis kann jede
 *    Client-Komponente auslösen, ohne dass jemand sie verkabelt.
 *
 * 2. **Unten, nicht oben.** Oben liegt auf dem Handy die Statusleiste
 *    und im Coach-Bereich die Kopfzeile. Unten ist der Daumen — und
 *    dort schaut man ohnehin hin, wenn man gerade etwas angetippt hat.
 *
 * 3. **Nur für Erfolge.** Fehler gehören an die Stelle, an der sie
 *    entstanden sind, nicht in eine Blase, die nach drei Sekunden
 *    verschwindet. Wer eine Fehlermeldung verpasst, weiß nicht, was
 *    schiefging.
 */

const EREIGNIS = "pt-toast";

interface ToastDetail {
  text: string;
}

/** Eine Bestätigung zeigen. Von überall aufrufbar. */
export function toast(text: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastDetail>(EREIGNIS, { detail: { text } }),
  );
}

interface Eintrag {
  id: number;
  text: string;
}

export function Toaster() {
  const [liste, setListe] = useState<Eintrag[]>([]);

  useEffect(() => {
    let naechste = 0;

    function an(e: Event) {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      if (!detail?.text) return;
      const id = (naechste += 1);
      setListe((prev) => [...prev, { id, text: detail.text }]);
      // 2,6 s: lang genug zum Lesen, kurz genug, dass niemand wartet.
      window.setTimeout(
        () => setListe((prev) => prev.filter((t) => t.id !== id)),
        2600,
      );
    }

    window.addEventListener(EREIGNIS, an);
    return () => window.removeEventListener(EREIGNIS, an);
  }, []);

  if (liste.length === 0) return null;

  return (
    <div className="pt-toasts" role="status" aria-live="polite">
      {liste.map((t) => (
        <div key={t.id} className="pt-toast">
          {t.text}
        </div>
      ))}
    </div>
  );
}
