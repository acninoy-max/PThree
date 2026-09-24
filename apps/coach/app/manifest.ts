import type { MetadataRoute } from "next";

/**
 * Web-App-Manifest.
 *
 * Damit lässt sich PTHREE auf den Homescreen legen und startet ohne
 * Browser-Rahmen: eigenes Icon, kein Adressfeld, eigener Eintrag im
 * App-Umschalter. Für den Athleten ist das mehr als Kosmetik — er öffnet
 * die App mitten im Training, und die Adresszeile kostet dort die Höhe
 * von zwei Satzzeilen.
 *
 * Als Route und nicht als statische Datei: Next setzt so die richtigen
 * Kopfzeilen und den Pfad selbst.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PTHREE",
    short_name: "PTHREE",
    description: "Trainingsplanung und Fortschritt für Personal Trainer",
    lang: "de",
    dir: "ltr",

    /**
     * Startziel ist die Wurzel, nicht /coach oder /athlete.
     *
     * Die Rollenweiche in der Middleware schickt jeden dorthin, wo er
     * hingehört. Ein festes Ziel im Manifest wäre für die Hälfte der
     * Nutzer die falsche Seite — und es steht fest, sobald jemand die
     * App abgelegt hat.
     */
    start_url: "/",
    scope: "/",

    /**
     * `standalone`: kein Adressfeld, keine Browser-Knöpfe. Bewusst nicht
     * `fullscreen` — dort verschwindet auch die Statusleiste, und wer im
     * Studio trainiert, will wissen, wie spät es ist.
     */
    display: "standalone",
    orientation: "portrait",

    // Sand wie der Hintergrund der App. Der Startbildschirm blitzt damit
    // nicht weiß auf, bevor die Seite da ist.
    background_color: "#f4f2ed",
    theme_color: "#f4f2ed",

    icons: [
      { src: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/favicon-512x512.png", sizes: "512x512", type: "image/png" },
      // Maskierbar: Android schneidet Kreise oder Rechtecke aus dem Bild.
      // Diese Fassungen haben 20 % Rand, damit das Zeichen heil bleibt.
      {
        src: "/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],

    /**
     * Verknüpfungen im Kontextmenü des Homescreen-Icons.
     *
     * Die beiden Wege, die im Studio zählen: Der Trainer will tracken,
     * der Athlet trainieren. Wer die falsche Rolle hat, landet über die
     * Rollenweiche trotzdem richtig.
     */
    shortcuts: [
      {
        name: "Training tracken",
        short_name: "Tracken",
        url: "/coach/track",
        icons: [{ src: "/favicon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Eigenes Training",
        short_name: "Training",
        url: "/athlete/log",
        icons: [{ src: "/favicon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
