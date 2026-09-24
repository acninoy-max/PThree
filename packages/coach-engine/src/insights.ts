/**
 * Coach-Engine — MVP-Umfang (bewusst "light").
 *
 * Drei Regeln, mehr nicht:
 *   1. Plateau   — ein Muster stagniert über mehrere Einheiten.
 *   2. Inaktiv   — der Klient hat länger nichts geloggt.
 *   3. Fortschritt — es geht messbar aufwärts (auch das ist ein Coaching-Anlass).
 *
 * Struktur-Wächter, Try-This-Vorschläge und Frequenzregeln kommen in Phase 2.
 * Die Engine ist framework-frei: gleiche Logik in Web, App und später
 * serverseitig für Ketten-Reports.
 */

import type { Client, MovementPattern, Session } from "@ptfive/types";
import { MOVEMENT_PATTERNS } from "@ptfive/types";
import { comparableScores, patternHistory } from "./metrics";

export type InsightKind = "plateau" | "inactive" | "progress";
export type InsightSeverity = "flag" | "nudge" | "info";

export interface Insight {
  /** Stabil über Neuberechnungen hinweg — taugt als React-Key. */
  id: string;
  kind: InsightKind;
  severity: InsightSeverity;
  clientId: string;
  pattern: MovementPattern | null;
  title: string;
  body: string;
  /** Konkreter nächster Schritt für den Coach. */
  action: string | null;
  detectedAt: string;
}

export interface EngineConfig {
  /** Wie viele Einheiten ohne Zuwachs als Plateau gelten. */
  plateauWindow: number;
  /** Zuwachs unterhalb dieser Schwelle zählt als Stillstand. */
  plateauThreshold: number;
  /** Tage ohne Logging, ab denen gewarnt wird. */
  inactivityDays: number;
  /** Zuwachs ab dieser Schwelle wird als Fortschritt gemeldet. */
  progressThreshold: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  plateauWindow: 3,
  plateauThreshold: 0.015,
  inactivityDays: 6,
  progressThreshold: 0.02,
};

const PATTERN_LABEL: Record<MovementPattern, string> = {
  push: "Oberkörper drücken",
  pull: "Oberkörper ziehen",
  squat: "Unterkörper drücken",
  hinge: "Hüftbeuge",
  overhead: "Über Kopf drücken",
};

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * Plateau je Muster.
 * Aus dem Buch: Stillstand ist normal — entscheidend ist, welchen Hebel man
 * dann zieht (Volumen, Intensität, Variation, Equipment).
 */
export function detectPlateaus(
  client: Client,
  sessions: readonly Session[],
  now: Date,
  config: EngineConfig = DEFAULT_CONFIG,
): Insight[] {
  const out: Insight[] = [];

  for (const pattern of MOVEMENT_PATTERNS) {
    const points = patternHistory(sessions, pattern);
    const scores = comparableScores(points);
    if (scores.length < config.plateauWindow) continue;

    const window = scores.slice(-config.plateauWindow);
    const first = window[0];
    if (first === undefined || first <= 0) continue;
    const peak = Math.max(...window);
    const growth = (peak - first) / first;
    if (growth > config.plateauThreshold) continue;

    out.push({
      id: `plateau:${client.id}:${pattern}`,
      kind: "plateau",
      severity: "flag",
      clientId: client.id,
      pattern,
      title: `${PATTERN_LABEL[pattern]} steht seit ${config.plateauWindow} Einheiten`,
      body: `${client.fullName} macht in diesem Muster keinen messbaren Fortschritt mehr. Normal — jetzt einen Hebel wählen.`,
      action:
        "Volumen erhöhen, Intensitätstechnik einsetzen, Übungsvariation wählen oder Equipment wechseln. Muster beibehalten, Winkel ändern.",
      detectedAt: now.toISOString(),
    });
  }

  return out;
}

/** Inaktivität — je früher erkannt, desto eher lässt sich Abwanderung verhindern. */
export function detectInactivity(
  client: Client,
  sessions: readonly Session[],
  now: Date,
  config: EngineConfig = DEFAULT_CONFIG,
): Insight | null {
  if (client.status !== "active") return null;

  const sorted = [...sessions].sort((a, b) =>
    a.performedAt.localeCompare(b.performedAt),
  );
  const last = sorted[sorted.length - 1];

  const since = last
    ? daysBetween(new Date(last.performedAt), now)
    : daysBetween(new Date(client.startedOn), now);

  if (since < config.inactivityDays) return null;

  return {
    id: `inactive:${client.id}`,
    kind: "inactive",
    severity: "nudge",
    clientId: client.id,
    pattern: null,
    title: last
      ? `Seit ${since} Tagen kein Training geloggt`
      : "Noch kein Training geloggt",
    body: last
      ? `Letzte Einheit von ${client.fullName} liegt ${since} Tage zurück.`
      : `${client.fullName} hat seit dem Start noch nichts geloggt.`,
    action: "Kurze Nachricht schicken und den nächsten Termin bestätigen.",
    detectedAt: now.toISOString(),
  };
}

/** Fortschritt sichtbar machen — Anlass für Bestätigung statt Korrektur. */
export function detectProgress(
  client: Client,
  sessions: readonly Session[],
  now: Date,
  config: EngineConfig = DEFAULT_CONFIG,
): Insight[] {
  const out: Insight[] = [];

  for (const pattern of MOVEMENT_PATTERNS) {
    const scores = comparableScores(patternHistory(sessions, pattern));
    if (scores.length < 2) continue;

    const latest = scores[scores.length - 1];
    const previous = scores[scores.length - 2];
    if (latest === undefined || previous === undefined || previous <= 0) continue;

    const growth = (latest - previous) / previous;
    if (growth < config.progressThreshold) continue;

    out.push({
      id: `progress:${client.id}:${pattern}`,
      kind: "progress",
      severity: "info",
      clientId: client.id,
      pattern,
      title: `${PATTERN_LABEL[pattern]}: plus ${Math.round(growth * 100)} Prozent`,
      body: `${client.fullName} hat sich gegenüber der letzten Einheit gesteigert.`,
      action: null,
      detectedAt: now.toISOString(),
    });
  }

  return out;
}

const SEVERITY_RANK: Record<InsightSeverity, number> = {
  flag: 0,
  nudge: 1,
  info: 2,
};

/**
 * Alle Regeln für einen Klienten. Ergebnis ist nach Dringlichkeit sortiert —
 * der Coach sieht oben, was heute Aufmerksamkeit braucht.
 *
 * Ein Plateau und gleichzeitiger Fortschritt im selben Muster schließen sich
 * aus; in dem Fall gewinnt das Plateau.
 */
export function analyseClient(
  client: Client,
  sessions: readonly Session[],
  now: Date = new Date(),
  config: EngineConfig = DEFAULT_CONFIG,
): Insight[] {
  const plateaus = detectPlateaus(client, sessions, now, config);
  const blocked = new Set(plateaus.map((p) => p.pattern));

  const insights: Insight[] = [
    ...plateaus,
    ...detectProgress(client, sessions, now, config).filter(
      (i) => !blocked.has(i.pattern),
    ),
  ];

  const inactive = detectInactivity(client, sessions, now, config);
  if (inactive) insights.push(inactive);

  return insights.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );
}

export interface ClientWithSessions {
  client: Client;
  sessions: readonly Session[];
}

/** Feed über alle Klienten eines Coaches — die Startseite der Coach-App. */
export function buildCoachFeed(
  entries: readonly ClientWithSessions[],
  now: Date = new Date(),
  config: EngineConfig = DEFAULT_CONFIG,
): Insight[] {
  return entries
    .flatMap((e) => analyseClient(e.client, e.sessions, now, config))
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
