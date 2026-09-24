import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Splash } from "./splash";
import { Toaster } from "./toast";

export const metadata: Metadata = {
  title: "PTHREE — Coach",
  description: "Das Betriebssystem für freelance Personal Trainer",
  // Ohne das startet die App auf iOS weiter im Browser-Rahmen — Apple
  // liest das Manifest für den Vollbildstart bis heute nicht aus.
  appleWebApp: {
    capable: true,
    title: "PTHREE",
    statusBarStyle: "default",
    /**
     * Startbilder für iOS.
     *
     * Ohne sie zeigt iOS beim Start aus dem Homescreen einen weißen
     * Schirm, bis die erste Seite da ist — und danach springt es auf
     * den Sandton der App. Genau dieser Sprung lässt es nach Website
     * aussehen und nicht nach App.
     *
     * Apple liest dafür bis heute nicht das Manifest, sondern verlangt
     * je Gerät ein eigenes Bild, ausgewählt über Punktgröße UND
     * Pixeldichte. Passt keine Zeile, bleibt es beim weißen Schirm —
     * deshalb die Liste und nicht ein Bild.
     *
     * Erzeugt von `scripts/startup-images.py`. Kommt ein Gerät dazu,
     * dort eintragen und das Skript laufen lassen.
     */
    startupImage: [
      {
        url: "/startup/iphone-16-pro-max.png",
        media:
          "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/startup/iphone-16-pro.png",
        media:
          "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/startup/iphone-15-pro-max.png",
        media:
          "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/startup/iphone-15-pro.png",
        media:
          "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/startup/iphone-14.png",
        media:
          "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/startup/iphone-13-mini.png",
        media:
          "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)",
      },
      {
        url: "/startup/iphone-11.png",
        media:
          "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/startup/iphone-se.png",
        media:
          "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)",
      },
      {
        url: "/startup/ipad-11.png",
        media:
          "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-192x192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-touch-icon-180x180.png", sizes: "180x180" }],
  },
};

/**
 * Editorial Sand — färbt Adressleiste und Tab auf Mobilgeräten.
 *
 * `viewportFit: "cover"` zieht die Seite bis in die Ecken hinter Notch
 * und Home-Leiste. Ohne das bleiben auf dem iPhone graue Balken stehen,
 * und die App sieht aus wie eine Website in einem Rahmen. Die Inhalte
 * halten über `env(safe-area-inset-*)` Abstand.
 *
 * `maximumScale` bleibt bewusst ungesetzt: Zoom zu verbieten ist eine
 * Barriere für alle, die schlecht sehen. Gegen den iOS-Zoom beim Tippen
 * hilft die Schriftgröße 17px in den Eingabefeldern, nicht ein Verbot.
 */
export const viewport: Viewport = {
  themeColor: "#F4F2ED",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" data-theme="light">
      <body>
        {/*
          Ganz vorn im Markup, damit der Browser sie zeichnet, bevor er
          mit dem Rest anfängt. Sie liegt über allem und räumt sich nach
          knapp einer Sekunde selbst weg — ohne JavaScript, siehe
          splash.tsx.
        */}
        <Splash />
        {children}
        {/* Nimmt Bestaetigungen aus der ganzen App entgegen. Liegt
            hier, damit keine Seite ihn selbst einbinden muss. */}
        <Toaster />
      </body>
    </html>
  );
}
