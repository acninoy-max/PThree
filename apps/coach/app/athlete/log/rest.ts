/**
 * Pausenuhr und Trainingsuhr.
 *
 * Beide rechnen aus Zeitstempeln, nicht aus gezählten Sekunden. Das ist
 * hier kein Feinschliff, sondern die Grundbedingung: Im Gym liegt das
 * Handy zwischen den Sätzen in der Tasche. Sobald der Bildschirm aus ist
 * oder der Tab in den Hintergrund geht, drosseln Browser setInterval oder
 * halten es ganz an. Eine Uhr, die "+1 Sekunde pro Tick" zählt, geht dann
 * genau in der Pause nach, für die sie da ist.
 *
 * Aus Zeitstempeln gerechnet ist die Anzeige nach dem Aufwachen sofort
 * richtig — die Uhr war nie falsch, sie wurde nur nicht gemalt.
 *
 * Bewusst ohne React: So lässt sich das hier ohne Browser durchrechnen.
 */

/** Ein Zeitraum, den die Uhr nicht mitzählt. `bis === null` = läuft noch. */
export interface Break {
  von: number;
  bis: number | null;
}

/**
 * Reine Trainingszeit in Sekunden: seit dem Start, abzüglich aller
 * Zeiträume, in denen der Athlet die Uhr angehalten hat.
 */
export function elapsedSeconds(
  startedAt: number,
  breaks: readonly Break[],
  now: number,
): number {
  if (now <= startedAt) return 0;

  let paused = 0;
  for (const b of breaks) {
    // Eine offene Pause zählt bis jetzt.
    const bis = b.bis ?? now;
    const von = Math.max(b.von, startedAt);
    if (bis > von) paused += bis - von;
  }

  return Math.max(0, Math.floor((now - startedAt - paused) / 1000));
}

/** Der laufende Pausen-Countdown. */
export interface Rest {
  /** Slot, nach dessen Satz die Pause läuft — für die Beschriftung. */
  slotKey: string;
  /** Zeitpunkt, zu dem die Pause endet. */
  endsAt: number;
  /** Ursprüngliche Dauer in Sekunden — Bezug für den Balken. */
  total: number;
  /** Signal schon gegeben? Verhindert Piepen bei jedem Neuzeichnen. */
  signalled: boolean;
}

/** Verbleibende Sekunden, nie negativ. Aufgerundet, damit "0:01" */
/*  eine ganze Sekunde lang steht und nicht eine halbe.            */
export function remainingSeconds(rest: Rest, now: number): number {
  return Math.max(0, Math.ceil((rest.endsAt - now) / 1000));
}

/** Anteil der abgelaufenen Pause, 0 bis 1 — für den Balken. */
export function restProgress(rest: Rest, now: number): number {
  if (rest.total <= 0) return 1;
  const done = (now - (rest.endsAt - rest.total * 1000)) / (rest.total * 1000);
  return Math.min(1, Math.max(0, done));
}

/**
 * Pause verlängern oder kürzen.
 *
 * Untergrenze ist der aktuelle Zeitpunkt: "−15 s" darf die Pause beenden,
 * aber nicht in die Vergangenheit schieben — sonst stünde eine negative
 * Restzeit da. Obergrenze 30 Minuten, damit ein Fehlgriff nicht in einer
 * Uhr endet, die den Rest des Tages läuft.
 */
export function shiftRest(rest: Rest, deltaSeconds: number, now: number): Rest {
  const endsAt = Math.min(
    Math.max(rest.endsAt + deltaSeconds * 1000, now),
    now + 30 * 60 * 1000,
  );
  // Der Bezugswert wächst mit, sonst liefe der Balken über.
  const total = Math.max(rest.total, Math.ceil((endsAt - now) / 1000));
  return {
    ...rest,
    endsAt,
    total,
    // Verlängern nach dem Signal heisst: nochmal Bescheid geben.
    signalled: rest.signalled && endsAt <= now,
  };
}

/** Pause aus einer Vorgabe starten. */
export function startRest(slotKey: string, seconds: number, now: number): Rest {
  return {
    slotKey,
    endsAt: now + seconds * 1000,
    total: seconds,
    signalled: false,
  };
}

/**
 * Voreinstellung, wenn der Plan nichts vorgibt.
 *
 * 90 Sekunden ist der übliche Mittelweg für Mehrgelenkübungen. Bewusst
 * eine Zahl und keine Ableitung aus dem Wiederholungsbereich: Der Athlet
 * korrigiert mit einem Tipp, eine schlaue Formel kann er nicht korrigieren.
 */
export const DEFAULT_REST_SECONDS = 90;

/** Sekunden als 1:30 — dieselbe Schreibweise wie die Trainingsuhr. */
export function restClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Trainingsuhr als 12:34.
 *
 * Dieselbe Funktion unter dem Namen, unter dem man sie sucht. Pausenuhr
 * und Trainingsuhr schreiben absichtlich gleich: Zwei Schreibweisen für
 * zwei Uhren im selben Bild sind eine Stolperstelle ohne Gegenwert.
 */
export const clock = restClock;
