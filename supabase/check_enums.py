#!/usr/bin/env python3
"""
Prueft, ob jeder Rollen-Name im Projekt wirklich in der Aufzaehlung steht.

WARUM ES DIESE PRUEFUNG GIBT
----------------------------
Migration 0022 setzte die Standardrolle auf 'client'. Die Aufzaehlung
`user_role` kennt nur 'coach', 'athlete' und 'org_admin' — 'client' ist
der Name der TABELLE, nicht der Rolle. Aufgefallen ist es nicht:

  * `create function` prueft den Rumpf von plpgsql nicht. Die Migration
    meldete Erfolg.
  * check_sql.py zaehlt Anweisungen und prueft Klammern. Ein falscher
    Wert in einer gueltigen Anweisung sieht fuer sie richtig aus.
  * tsc kennt die Datenbank nicht.

Der Fehler haette beim ersten echten Registrierungsversuch zugeschlagen
— also bei Joel, nicht bei mir.

WAS GEPRUEFT WIRD
-----------------
  SQL   'x'::enumtyp
        variable := 'x'        (Variable in DECLARE als Enum deklariert)
        variable =  'x'
  TS    role === "x" / !== "x"
        role: "x"              (z. B. in signUp-Metadaten)
        .eq("role", "x")

Gegen die Labels aus `create type ... as enum (...)`.

EIGENPRUEFUNG
-------------
Findet das Skript die Aufzaehlung `user_role` nicht oder prueft es gar
keine Literale, endet es mit 2. Eine Pruefung, die nichts findet, darf
nicht wie eine bestandene Pruefung aussehen — das war der eigentliche
Fehler hinter 0022.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
MIGRATIONEN = Path(__file__).resolve().parent / "migrations"
APP = WURZEL / "apps" / "coach"
PAKETE = WURZEL / "packages"

# 'coach', 'athlete' — einfache Anfuehrungszeichen, keine Escapes noetig
LITERAL = r"'([a-z_][a-z0-9_]*)'"


def enums_einlesen() -> dict[str, set[str]]:
    """Alle `create type ... as enum (...)` aus den Migrationen."""
    gefunden: dict[str, set[str]] = {}
    muster = re.compile(
        r"create\s+type\s+(\w+)\s+as\s+enum\s*\(([^)]*)\)", re.I | re.S
    )
    for datei in sorted(MIGRATIONEN.glob("*.sql")):
        for name, rumpf in muster.findall(datei.read_text(encoding="utf-8")):
            gefunden.setdefault(name, set()).update(re.findall(LITERAL, rumpf))
    return gefunden


def zeile_von(text: str, position: int) -> int:
    return text.count("\n", 0, position) + 1


def sql_pruefen(enums: dict[str, set[str]]) -> tuple[list[str], int]:
    fehler: list[str] = []
    geprueft = 0

    typnamen = "|".join(sorted(enums, key=len, reverse=True))
    cast = re.compile(LITERAL + r"\s*::\s*(" + typnamen + r")\b", re.I)

    for datei in sorted(MIGRATIONEN.glob("*.sql")):
        text = datei.read_text(encoding="utf-8")
        ohne_kommentar = re.sub(r"--[^\n]*", "", text)

        for treffer in cast.finditer(ohne_kommentar):
            wert, typ = treffer.group(1), treffer.group(2)
            geprueft += 1
            if wert not in enums[typ]:
                fehler.append(
                    f"{datei.name}:{zeile_von(ohne_kommentar, treffer.start())}  "
                    f"'{wert}'::{typ} — {typ} kennt nur "
                    f"{sorted(enums[typ])}"
                )

        # Variablen, die in einem DECLARE-Block als Aufzaehlung deklariert
        # sind. Danach zaehlt jede Zuweisung und jeder Vergleich.
        for typ, labels in enums.items():
            for var in set(
                re.findall(r"^\s*(\w+)\s+" + typ + r"\s*;", ohne_kommentar, re.M | re.I)
            ):
                # ZUWEISUNG (`:=`): die ganze rechte Seite bis zum
                # Semikolon, nicht nur das erste Literal. Genau daran
                # waere 0022 vorbeigerutscht — der falsche Wert stand als
                # zweiter coalesce-Ausdruck zwei Zeilen tiefer.
                zuweisung = re.compile(
                    r"\b" + re.escape(var) + r"\s*:=\s*([^;]{0,400}?);", re.S
                )
                # VERGLEICH (`=`, `<>`): nur das unmittelbar folgende
                # Literal. Ein Vergleich steht mitten in einer Bedingung,
                # und alles bis zum naechsten Semikolon zu lesen wuerde
                # `not in ('service_role', …)` mit einsammeln — Rollen der
                # Datenbank, nicht Rollen des Produkts.
                vergleich = re.compile(
                    r"\b" + re.escape(var) + r"\s*(?:=|<>|!=)\s*" + LITERAL
                )

                stellen: list[tuple[int, str]] = []
                for treffer in zuweisung.finditer(ohne_kommentar):
                    # JSON-Schluessel sind keine Rollen: `->> 'role'` meint
                    # das Feld, nicht den Wert.
                    rechts = re.sub(r"->>?\s*'[^']*'", "", treffer.group(1))
                    stellen += [
                        (treffer.start(), w) for w in re.findall(LITERAL, rechts)
                    ]
                stellen += [
                    (t.start(), t.group(1)) for t in vergleich.finditer(ohne_kommentar)
                ]

                for position, wert in stellen:
                    geprueft += 1
                    if wert not in labels:
                        fehler.append(
                            f"{datei.name}:"
                            f"{zeile_von(ohne_kommentar, position)}  "
                            f"{var} ({typ}) gegen '{wert}' — {typ} kennt "
                            f"nur {sorted(labels)}"
                        )

    return fehler, geprueft


def ts_pruefen(labels: set[str]) -> tuple[list[str], int]:
    """Rollen-Zeichenketten im Anwendungscode."""
    fehler: list[str] = []
    geprueft = 0

    muster = [
        re.compile(r'\brole\s*(?:===|!==|==|!=)\s*"([a-z_]+)"'),
        re.compile(r'\brole\s*:\s*"([a-z_]+)"'),
        re.compile(r'\.eq\(\s*"role"\s*,\s*"([a-z_]+)"\s*\)'),
    ]

    dateien: list[Path] = []
    for ordner in (APP, PAKETE):
        for endung in ("*.ts", "*.tsx"):
            dateien += [
                p
                for p in ordner.rglob(endung)
                if "node_modules" not in p.parts and ".next" not in p.parts
            ]

    for datei in sorted(dateien):
        text = datei.read_text(encoding="utf-8")
        for m in muster:
            for treffer in m.finditer(text):
                wert = treffer.group(1)
                geprueft += 1
                if wert not in labels:
                    fehler.append(
                        f"{datei.relative_to(WURZEL)}:"
                        f"{zeile_von(text, treffer.start())}  "
                        f"role = \"{wert}\" — user_role kennt nur "
                        f"{sorted(labels)}"
                    )

    return fehler, geprueft


def main() -> int:
    enums = enums_einlesen()

    if "user_role" not in enums or not enums["user_role"]:
        print(
            "  EIGENPRUEFUNG FEHLGESCHLAGEN — die Aufzaehlung `user_role`\n"
            "  wurde in den Migrationen nicht gefunden. Wahrscheinlich hat\n"
            "  sich die Schreibweise von `create type` geaendert. Bis das\n"
            "  geklaert ist, prueft dieses Skript NICHTS.",
            file=sys.stderr,
        )
        return 2

    sql_fehler, sql_anzahl = sql_pruefen(enums)
    ts_fehler, ts_anzahl = ts_pruefen(enums["user_role"])

    if sql_anzahl + ts_anzahl == 0:
        print(
            "  EIGENPRUEFUNG FEHLGESCHLAGEN — kein einziges Rollen-Literal\n"
            "  gefunden. Das ist kein sauberes Ergebnis, das ist ein\n"
            "  blindes Skript.",
            file=sys.stderr,
        )
        return 2

    fehler = sql_fehler + ts_fehler
    if fehler:
        print(f"  {len(fehler)} Rollen-Name(n) ohne Entsprechung:\n")
        for zeile in fehler:
            print(f"    {zeile}")
        print(
            "\n  Diese Werte sind syntaktisch gueltiges SQL und scheitern\n"
            "  erst zur Laufzeit — beim ersten Nutzer, der sich anmeldet."
        )
        return 1

    aufzaehlungen = ", ".join(
        f"{name} ({len(werte)})" for name, werte in sorted(enums.items())
    )
    print(
        f"  OK — {sql_anzahl} Literal(e) in SQL und {ts_anzahl} im Code\n"
        f"       gegen {aufzaehlungen} geprueft."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
