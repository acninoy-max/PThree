#!/usr/bin/env python3
"""
Startbilder fuer iOS erzeugen.

Ohne sie zeigt iOS beim Start aus dem Homescreen einen weissen Schirm,
bis die erste Seite da ist — und springt danach auf den Sandton der App.
Genau dieser Sprung laesst es nach Website aussehen statt nach App.

Apple liest dafuer bis heute nicht das Manifest, sondern verlangt je
Geraet ein eigenes Bild, ausgewaehlt ueber Punktgroesse UND Pixeldichte.
Passt keine Zeile, bleibt es beim weissen Schirm. Deshalb die Liste
unten und nicht ein Bild.

    python3 apps/coach/scripts/startup-images.py

Das Skript schreibt die Bilder nach public/startup/ und gibt die Liste
aus, die in app/layout.tsx unter `appleWebApp.startupImage` steht. Kommt
ein Geraet dazu: hier eintragen, laufen lassen, Ausgabe uebernehmen.
"""

import json
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow fehlt:  pip3 install --break-system-packages Pillow")

HIER = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HIER)

# Editorial Sand — derselbe Ton wie der Hintergrund der App. Nur dann
# ist der Uebergang vom Startbild in die Seite unsichtbar.
SAND = (244, 242, 237, 255)

# (Name, Breite in pt, Hoehe in pt, Pixeldichte)
GERAETE = [
    ("iphone-16-pro-max", 440, 956, 3),
    ("iphone-16-pro", 402, 874, 3),
    ("iphone-15-pro-max", 430, 932, 3),
    ("iphone-15-pro", 393, 852, 3),
    ("iphone-14", 390, 844, 3),
    ("iphone-13-mini", 375, 812, 3),
    ("iphone-11", 414, 896, 2),
    ("iphone-se", 375, 667, 2),
    ("ipad-11", 834, 1194, 2),
]


def main() -> None:
    mark = Image.open(os.path.join(APP, "public", "pt3-wordmark.png"))
    mark = mark.convert("RGBA")

    ziel_ordner = os.path.join(APP, "public", "startup")
    os.makedirs(ziel_ordner, exist_ok=True)

    eintraege = []

    for name, w, h, dichte in GERAETE:
        px_w, px_h = w * dichte, h * dichte
        bild = Image.new("RGBA", (px_w, px_h), SAND)

        # 42 % der Breite, aber hoechstens 22 % der Hoehe. Die zweite
        # Grenze greift beim iPad und beim SE, wo ein Bild nach der
        # Breitenregel die halbe Seite fuellen wuerde.
        ziel_b = int(px_w * 0.42)
        ziel_h = int(ziel_b * mark.height / mark.width)
        if ziel_h > px_h * 0.22:
            ziel_h = int(px_h * 0.22)
            ziel_b = int(ziel_h * mark.width / mark.height)

        klein = mark.resize((ziel_b, ziel_h), Image.LANCZOS)
        bild.alpha_composite(klein, ((px_w - ziel_b) // 2, (px_h - ziel_h) // 2))

        pfad = os.path.join(ziel_ordner, f"{name}.png")
        bild.convert("RGB").save(pfad, "PNG", optimize=True)
        print(f"  {name}.png  {px_w}x{px_h}")

        eintraege.append(
            {
                "url": f"/startup/{name}.png",
                "media": (
                    f"(device-width: {w}px) and (device-height: {h}px) "
                    f"and (-webkit-device-pixel-ratio: {dichte})"
                ),
            }
        )

    print("\nFuer app/layout.tsx, appleWebApp.startupImage:\n")
    print(json.dumps(eintraege, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
