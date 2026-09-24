#!/usr/bin/env bash
#
# Tests fuer die reine Logik der App.
#
# Die Engine hat ihre eigenen Tests. In der App liegt aber ebenfalls
# Logik, die nichts mit React zu tun hat und die schon zweimal Fehler
# produziert hat, die erst im Studio auffielen:
#
#   app/plan-week.ts            Datumsrechnung (Zeitzonen-Bug 09.09.)
#   app/format.ts               Datumsformate (Hydration-Bug)
#   app/athlete/log/rest.ts     Uhren aus Zeitstempeln
#   app/coach/clients/[id]/sections.ts
#                               Anordnung der Klientenakte
#   app/athlete/photos/compare.ts
#                               Vorher-Nachher: Spannen, Gewichte
#
# Alles davon ist ohne Browser durchrechenbar. Aufgenommen wird nur, was
# keine React- oder Next-Importe hat — sonst braeuchte es einen Bundler
# und der Nutzen waere hin.
#
#     bash apps/coach/run-tests.sh
#
set -euo pipefail

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WURZEL="$(cd "$HIER/../.." && pwd)"
ZIEL="${TMPDIR:-/tmp}/ptthree-app"
TSC="$WURZEL/node_modules/typescript/lib/tsc.js"

if [ ! -f "$TSC" ]; then
  echo "TypeScript fehlt unter $TSC — erst 'pnpm install' laufen lassen." >&2
  exit 1
fi

rm -rf "$ZIEL"
mkdir -p "$ZIEL"

cat > "$ZIEL/tsconfig.json" <<JSON
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "outDir": "$ZIEL/out",
    "rootDir": "$HIER/app",
    "typeRoots": ["$WURZEL/node_modules/@types"]
  },
  "files": [
    "$HIER/app/format.ts",
    "$HIER/app/plan-week.ts",
    "$HIER/app/athlete/log/rest.ts",
    "$HIER/app/coach/clients/[id]/sections.ts",
    "$HIER/app/coach/clients/[id]/sections.test.ts",
    "$HIER/app/athlete/photos/compare.ts",
    "$HIER/app/athlete/photos/compare.test.ts"
  ]
}
JSON

node "$TSC" -p "$ZIEL/tsconfig.json"

cd "$ZIEL/out"
# Keine Tests gefunden waere ein stiller Durchlauf — genau die Art
# Pruefung, die nichts prueft.
ANZAHL=$(find . -name '*.test.js' | wc -l | tr -d ' ')
if [ "$ANZAHL" -eq 0 ]; then
  echo "Keine Testdateien uebersetzt — Konfiguration pruefen." >&2
  exit 1
fi

# Jede Datei einzeln mit `node <datei>` statt `node --test <muster>`.
#
# Der Grund steht im Pfad: `app/coach/clients/[id]/`. Node deutet die
# Argumente von `--test` als Suchmuster, und `[id]` ist dort eine
# Zeichenklasse — gesucht wird also in `clients/i/`, `clients/d/`.
# Gefunden wird nichts, und der Lauf meldet fröhlich „0 Tests bestanden".
# Genau die Art Pruefung, die nichts prueft.
#
# Direkt ausgefuehrt laedt node:test die Tests selbst und setzt den
# Rueckgabewert auf 1, sobald einer scheitert.
FEHLER=0
while IFS= read -r datei; do
  echo "── ${datei#./}"
  node "$datei" || FEHLER=1
done < <(find . -name '*.test.js' | sort)

exit "$FEHLER"
