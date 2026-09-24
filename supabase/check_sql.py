#!/usr/bin/env python3
"""Prüft die SQL-Dateien, bevor sie in Supabase laufen.

Warum es das gibt: Ein Syntaxparser allein reicht nicht. Er hat

    to_jsonb(e) -> 'a' @> to_jsonb(e) -> 'b'

anstandslos durchgewunken — gültige Syntax, aber falsch gruppiert, weil
`->` stärker bindet als `@>`. Postgres liest daraus
`(a -> 'a' @> b) -> 'b'` und bricht mit „operator does not exist:
boolean -> unknown" ab. Aufgefallen ist das erst im SQL-Editor.

Ohne laufenden Postgres lässt sich SQL nicht typprüfen. Was sich prüfen
lässt, sind die Fehlerklassen, die uns schon einmal getroffen haben —
und genau die stehen hier.

    python3 supabase/check_sql.py
"""

from __future__ import annotations

import glob
import os
import re
import sys

try:
    import pglast
    from pglast import parse_sql
    from pglast.ast import A_Expr, ColumnRef, Node
except ImportError:  # pragma: no cover
    print("pglast fehlt:  pip install pglast --break-system-packages")
    sys.exit(2)


HIER = os.path.dirname(os.path.abspath(__file__))

# Operatoren, deren Ergebnis ein Wahrheitswert ist. Ein `->` darauf
# anzuwenden ist immer ein Gruppierungsfehler.
BOOLESCH = {"@>", "<@", "=", "<>", "<", ">", "<=", ">=", "&&", "?", "?|", "?&"}

fehler: list[str] = []
warnungen: list[str] = []


def kinder(node):
    """Alle Unterknoten eines AST-Knotens."""
    for feld in getattr(node, "__slots__", ()) or ():
        wert = getattr(node, feld, None)
        if isinstance(wert, (list, tuple)):
            yield from (x for x in wert if isinstance(x, Node))
        elif isinstance(wert, Node):
            yield wert


def durchlaufen(node, datei: str):
    """Sucht den Gruppierungsfehler rund um `->`."""
    if isinstance(node, A_Expr) and node.name:
        op = node.name[0].sval
        if op in ("->", "->>"):
            for seite, operand in (("links", node.lexpr), ("rechts", node.rexpr)):
                if (
                    isinstance(operand, A_Expr)
                    and operand.name
                    and operand.name[0].sval in BOOLESCH
                ):
                    fehler.append(
                        f"{datei}: `{op}` wird auf das Ergebnis von "
                        f"`{operand.name[0].sval}` angewendet ({seite}). "
                        f"Postgres bindet `{op}` staerker — klammere den "
                        f"jsonb-Zugriff ein."
                    )
    for kind in kinder(node):
        durchlaufen(kind, datei)


def spalten_im_klartext(datei: str, text: str):
    """Direkter Zugriff auf Spalten aus neueren Migrationen.

    `check_schema.sql` soll bei JEDEM Migrationsstand laufen. Postgres
    loest Spaltennamen beim Planen auf — eine fehlende Spalte laesst die
    ganze Abfrage scheitern, auch wenn sie nur in einer Infozeile
    vorkommt. Deshalb dort ueberall der Umweg ueber `to_jsonb(...)`.
    """
    neuere = [
        "weekdays",
        "muscle_group",
        "secondary_muscle_groups",
        "bodyweight_factor",
        "body_load_kg",
        "recorded_by",
        "setup",
    ]
    for zeile_nr, zeile in enumerate(text.split("\n"), 1):
        if zeile.strip().startswith("--"):
            continue
        for spalte in neuere:
            # `alias.spalte` ohne to_jsonb in derselben Zeile
            if re.search(rf"\b[a-z]{{1,3}}\.{spalte}\b", zeile) and "to_jsonb" not in zeile:
                fehler.append(
                    f"{datei}:{zeile_nr}: direkter Zugriff auf `{spalte}`. "
                    f"Fehlt die Spalte, scheitert die ganze Datei statt sie "
                    f"zu melden — nimm `to_jsonb(zeile) ->> '{spalte}'`."
                )


def main() -> int:
    dateien = sorted(glob.glob(os.path.join(HIER, "migrations", "*.sql")))
    pruefdatei = os.path.join(HIER, "check_schema.sql")
    if os.path.exists(pruefdatei):
        dateien.append(pruefdatei)

    if not dateien:
        print("Keine SQL-Dateien gefunden.")
        return 2

    for pfad in dateien:
        name = os.path.basename(pfad)
        text = open(pfad, encoding="utf-8").read()

        try:
            stmts = parse_sql(text)
        except Exception as e:  # noqa: BLE001
            fehler.append(f"{name}: Syntaxfehler — {e}")
            continue

        for st in stmts:
            durchlaufen(st.stmt, name)

        if name == "check_schema.sql":
            spalten_im_klartext(name, text)
            # Der SQL-Editor zeigt nur das Ergebnis der letzten Anweisung.
            # Zwei Abfragen hiessen: die Pruefungen bleiben unsichtbar.
            if len(stmts) != 1:
                fehler.append(
                    f"{name}: {len(stmts)} Anweisungen. Es muss genau eine "
                    f"sein, sonst zeigt der SQL-Editor die Pruefungen nicht."
                )

        print(f"  OK   {name}  ({len(stmts)} Anweisungen)")

    print()
    for w in warnungen:
        print(f"  Hinweis: {w}")
    if fehler:
        print(f"  {len(fehler)} Problem(e):\n")
        for f in fehler:
            print(f"   - {f}")
        return 1

    print(f"  {len(dateien)} Dateien geprueft, keine Beanstandung.")
    print("  Achtung: ohne laufenden Postgres ist keine Typpruefung moeglich.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
