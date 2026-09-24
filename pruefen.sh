#!/usr/bin/env bash
#
# Alle Pruefungen auf einmal.
#
#     bash pruefen.sh
#
# Aus dem Wurzelverzeichnis des Projekts aufrufen — die Pfade unten sind
# relativ dazu, und `npx tsc -p apps/coach/tsconfig.json` findet von
# woanders nichts.
#
# Bricht NICHT beim ersten Fehler ab. Wer vor dem Ausrollen prueft, will
# alle Baustellen auf einmal sehen und nicht neunmal neu starten. Am Ende
# steht eine Liste mit dem, was gerissen ist.
#
# Was hier NICHT drinsteht: `npx next build`. Der gehoert dazu, dauert
# aber Minuten statt Sekunden — der laeuft einmal vor dem Ausrollen, das
# hier laeuft nach jeder Aenderung.

set -u
cd "$(dirname "$0")" || exit 1

# Python aus der projekteigenen Umgebung, falls es sie gibt.
#
# Homebrew-Python laesst sich seit PEP 668 nicht mehr mit `pip install`
# beschreiben, und der Ausweg `--break-system-packages` kann die
# Homebrew-Installation zerlegen. Deshalb liegt `pglast` in `.venv` im
# Projekt — einmal anlegen:
#
#     python3 -m venv .venv
#     .venv/bin/pip install pglast
#
# Ohne .venv nimmt das Skript das System-Python. Dann meldet die
# SQL-Pruefung, dass pglast fehlt — und das ist die richtige Meldung,
# nicht "OK".
if [ -x .venv/bin/python3 ]; then
  PY=.venv/bin/python3
else
  PY=python3
fi

fehler=()

lauf() {
  local name="$1"
  shift
  printf '\n\033[1m── %s\033[0m\n' "$name"
  if "$@"; then
    return 0
  fi
  fehler+=("$name")
  return 0
}

lauf "TypeScript"        npx tsc -p apps/coach/tsconfig.json --noEmit
lauf "Datumsformate"     node apps/coach/check-format.mjs
lauf "Layout"            node apps/coach/check-layout.mjs
lauf "Server Actions"    node apps/coach/check-actions.mjs
lauf "Schriftgroessen"   node apps/coach/check-scale.mjs
lauf "SQL"               "$PY" supabase/check_sql.py
lauf "Rollen-Namen"      "$PY" supabase/check_enums.py
lauf "Engine-Tests"      bash packages/coach-engine/run-tests.sh
lauf "App-Tests"         bash apps/coach/run-tests.sh

echo
if [ ${#fehler[@]} -eq 0 ]; then
  printf '\033[32m✓ Alle neun Pruefungen sauber.\033[0m\n'
  exit 0
fi

printf '\033[31m✗ %d Pruefung(en) gerissen:\033[0m\n' "${#fehler[@]}"
for name in "${fehler[@]}"; do
  printf '    %s\n' "$name"
done
exit 1
