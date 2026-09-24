#!/usr/bin/env bash
#
# Engine-Tests ohne Paketinstallation.
#
# `pnpm test` braucht die Abhängigkeiten des Arbeitsbereichs. In einer
# frischen Umgebung — und in jeder Sandbox — sind die nicht da oder für
# das falsche Betriebssystem gebaut. Dann sind die Tests genau dann nicht
# ausführbar, wenn man sie am nötigsten braucht.
#
# Dieser Weg braucht nur Node und den TypeScript-Compiler aus dem
# Arbeitsbereich: übersetzen nach /tmp, `@ptfive/types` zur Laufzeit
# auflösbar machen, `node --test` darüberlaufen lassen.
#
#     bash packages/coach-engine/run-tests.sh
#
set -euo pipefail

WURZEL="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ZIEL="${TMPDIR:-/tmp}/ptthree-engine"
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
    "rootDir": "$WURZEL/packages",
    "baseUrl": "$WURZEL",
    "paths": { "@ptfive/types": ["packages/types/src/index.ts"] },
    // Die tsconfig liegt in /tmp, die Typen liegen im Arbeitsbereich.
    // Ohne diesen Zeiger findet tsc 'node:test' nicht.
    "typeRoots": ["$WURZEL/node_modules/@types"]
  },
  "include": [
    "$WURZEL/packages/coach-engine/src/**/*.ts",
    "$WURZEL/packages/types/src/**/*.ts"
  ]
}
JSON

node "$TSC" -p "$ZIEL/tsconfig.json"

# Zur Laufzeit löst Node keine tsconfig-Pfade auf. Ein Ordner im
# node_modules-Baum der Ausgabe genügt.
mkdir -p "$ZIEL/out/node_modules/@ptfive"
ln -sfn "$ZIEL/out/types/src" "$ZIEL/out/node_modules/@ptfive/types"
printf '{ "name": "@ptfive/types", "main": "index.js" }\n' \
  > "$ZIEL/out/types/src/package.json"

cd "$ZIEL/out"
node --test coach-engine/src/*.test.js
