# CLAUDE.md

Diese Datei wird bei jedem Start gelesen. Sie ist deshalb kurz und
enthält nur, was in **jeder** Sitzung gilt.

**Zuerst `PROJEKTSTAND.md` lesen.** Dort steht, was das Produkt ist, wie
es aufgebaut ist, welche Eigenheiten man nicht erraten kann und welche
Fehler hier schon gemacht wurden. Ohne Abschnitt 3 und 7 daraus baust du
die vierte Variante desselben Fehlers.

---

## Projekt in drei Sätzen

PTHREE — SaaS für freelance Personal Trainer. Eine Next.js-App
(`apps/coach`) mit zwei Oberflächen: `/coach/*` für den Trainer,
`/athlete/*` mobil für den Klienten. Supabase liefert Postgres, Auth und
Storage; läuft öffentlich unter `https://pthree-wine.vercel.app`.

**Sprache:** Code, Kommentare und Dokumente bleiben **Deutsch**. Die
**Oberfläche ist zweisprachig** — Englisch ist Standard (Launch in den
Niederlanden, entschieden am 07.10.2026), Deutsch wählbar. Jeder
sichtbare Text steht in `app/i18n/de` und `app/i18n/en`, nie direkt im
Markup; `check-texte.mjs` wacht darüber.

---

## Vor jedem Commit

```bash
bash pruefen.sh
```

Zehn Prüfungen. Erwartung: `✓ Alle zehn Pruefungen sauber.` Nichts
committen, solange eine rot ist.

Bau: **`pnpm build` im Wurzelverzeichnis**, nie `npx next build` — das
sucht `app` neben sich und lädt sich die falsche Next-Fassung aus dem
Netz.

---

## Acht Regeln, die hier nicht verhandelbar sind

**1. Die Zeilensicherheit ist die Sicherheitsgrenze, nicht der Code.**
Die App filtert nirgends nach `coach_id` — sie fragt, und die Datenbank
gibt nur heraus, was dem Angemeldeten gehört. Jede neue Tabelle bekommt
eine RLS-Regel, sonst ist sie für jeden Angemeldeten offen.

**2. RLS entscheidet über Zeilen, nicht über Spalten.** Spaltenschutz
braucht einen Trigger. Vorbilder: `guard_client_self_edit`,
`guard_check_in_columns`.

**3. Nach jedem schreibenden Vorgang zurücklesen, ob er gewirkt hat —
und bei Misserfolg abbrechen, nicht schweigen.** Das ist die Lehre aus
drei Fehlern, die alle dieselbe Form hatten: Eine Sicherung, die im
Fehlerfall nichts sagt. `update … where …` ändert null Zeilen und meldet
Erfolg; ein Trigger setzt einen Wert still zurück; ein Prüfer meldet
Entwarnung, obwohl er blind ist. Siehe `PROJEKTSTAND.md` Abschnitt 7.

**4. Eine Prüfung, die nicht laufen kann, darf nicht aussehen wie eine
bestandene Prüfung.** Jeder Prüfer in `pruefen.sh` hat eine
Selbstprüfung und endet mit Code 2, wenn er sein Fundament nicht findet.
Wer einen neuen schreibt, baut den Fehler einmal absichtlich wieder ein
und sieht nach, ob er anschlägt.

**5. Migrationen sind durchnummeriert und werden von Hand im
Supabase-SQL-Editor eingespielt.** Es gibt keine Migrationsverwaltung.
Neue Nummer, nie eine bestehende ändern. Zu jeder Migration gehören
Zeilen in `supabase/check_schema.sql` — sonst merkt niemand, dass sie
fehlt.

**6. Kein Inline-Style, der eine Media-Query aushebelt. Keine freien
Schriftgrößen.** Ein `style`-Attribut schlägt jede Stylesheet-Regel,
auch die aus `@media`; daran ist das Mobil-Layout zweimal gebrochen.
Größen stehen als `--pt-fs-*`-Token in `globals.css`.

**7. Datum und Zahlen nur über `t.fmt`** (gebaut in `app/format.ts`).
`toLocaleDateString` liefert in Node und in mobilem Safari
Unterschiedliches — das erzeugt Hydration-Fehler, die nur auf dem Handy
auftreten. Englisch heißt europäisch: Tag vor Monat, 24 Stunden.

**8. Texte nur über das Wörterbuch.** Server: `getT()` aus
`app/i18n/server`, Browser: `useT()` aus `app/i18n/client`. Neuer
Schlüssel zuerst in `de/`, dann meldet `tsc`, was in `en/` fehlt. Die
Sprache entscheidet der Server (Cookie, dann Browser-Sprache) — nie der
Browser selbst, sonst Hydration-Fehler.

---

## Kommentare

Kommentare erklären **warum**, nicht was. Das ist hier durchgängig so
und soll so bleiben: Die meisten Fallen in diesem Projekt sind nicht am
Code ablesbar, sondern Folge einer Eigenheit von Postgres, Next oder
iOS. Wer eine davon umschifft, schreibt dazu, wovor er ausweicht —
sonst entfernt sie der Nächste als überflüssig.

---

## Was du nicht ungefragt tust

- **Echte Klientendaten anlegen oder annehmen.** Impressum und
  Datenschutzerklärung fehlen; der Einwilligungstext für die Fotos ist
  nicht anwaltlich geprüft. Bis dahin gilt: Testdaten.
- **Eine bestehende Migration ändern.** Außer die Änderung wird im Kopf
  der Datei dokumentiert, wie in 0022.
- **Den `service_role`-Schlüssel irgendwo eintragen.** Er hebelt jede
  Zeilensicherheit aus und wird von keiner Server-Funktion gebraucht.
- **Behaupten, etwas sei geprüft, wenn es nur kompiliert.** `tsc` sieht
  die Datenbank nicht, und `pruefen.sh` sieht keinen Browser.
