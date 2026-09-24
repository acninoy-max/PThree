/**
 * Trainingsmodell.
 *
 * Kernidee (aus Joëls Buch): Ein Plan besteht aus SLOTS — jeder Slot ist ein
 * Bewegungsmuster plus Block. Die konkrete Übung ist nur das Werkzeug im Slot
 * und darf jederzeit getauscht werden. Progression wird deshalb pro MUSTER
 * geführt, nicht pro Übung. Das löst das "1Fit-Problem": Wer die Übung
 * wechselt oder zwischendurch allein trainiert, verliert seine Historie nicht.
 */

export type UUID = string;
/** ISO-8601, immer UTC. */
export type ISODateTime = string;
/** YYYY-MM-DD. */
export type ISODate = string;

/** Die fünf Grundmuster. */
export type MovementPattern =
  | "push" // Oberkörper drücken
  | "pull" // Oberkörper ziehen
  | "squat" // Unterkörper drücken
  | "hinge" // Unterkörper ziehen / Hüftbeuge
  | "overhead"; // Über Kopf drücken

export const MOVEMENT_PATTERNS: readonly MovementPattern[] = [
  "push",
  "pull",
  "squat",
  "hinge",
  "overhead",
] as const;

/**
 * Muskelgruppen — die Sprache, in der Trainer und Athleten reden.
 *
 * Nicht dasselbe wie das Bewegungsmuster und auch nicht daraus
 * abgeleitet: Enge Liegestütze sind „Drücken", trainieren aber den
 * Trizeps. Beide Angaben stehen deshalb nebeneinander. Sichtbar ist die
 * Muskelgruppe, das Muster hält den Slot beim Übungstausch zusammen.
 *
 * Beine sind aufgeteilt. „Beine" träfe auf Beinstrecker und Wadenheben
 * gleichermassen zu und sagt damit im Studio nichts.
 */
export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "calves"
  | "glutes"
  | "core";

/** Reihenfolge in der Oberfläche: oben nach unten, gross nach klein. */
export const MUSCLE_GROUPS: readonly MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
] as const;

export const MUSCLE_GROUP_LABEL: Record<MuscleGroup, string> = {
  chest: "Brust",
  back: "Rücken",
  shoulders: "Schultern",
  biceps: "Bizeps",
  triceps: "Trizeps",
  quads: "Quadrizeps",
  hamstrings: "Beinbeuger",
  calves: "Waden",
  glutes: "Gesäß",
  core: "Rumpf",
};

/** Reihenfolge innerhalb einer Einheit: erst schwer, dann dynamisch, dann Detail. */
export type TrainingBlock = "compound" | "functional" | "isolation" | "core";

export const BLOCK_ORDER: readonly TrainingBlock[] = [
  "compound",
  "functional",
  "isolation",
  "core",
] as const;

export type ExperienceLevel = "beginner" | "intermediate" | "pro";

export interface Exercise {
  id: UUID;
  /** null = globale Bibliothek, sonst Eigentum eines Coaches. */
  coachId: UUID | null;
  name: string;
  /** null = keinem Grundmuster zugeordnet, z. B. Rumpfarbeit. */
  pattern: MovementPattern | null;
  /**
   * Hauptsächlich trainierte Muskelgruppe. Eine, nicht mehrere: Die
   * Auswertung zählt hierüber, und zwei Hauptgruppen hiessen doppeltes
   * Volumen in der Statistik.
   */
  muscleGroup: MuscleGroup;
  /**
   * Weitere Gruppen, unter denen die Übung gefunden werden soll.
   *
   * Aus Joels Rückmeldung: Shrugs sucht der eine unter Rücken, der
   * andere unter Schultern. Beide sollen sie finden. Rein für die Suche
   * — in der Auswertung taucht nur die Hauptgruppe auf.
   */
  secondaryMuscleGroups: MuscleGroup[];
  /**
   * Anteil des Körpergewichts, den die Übung bewegt. 1,0 = ganzer Körper
   * (Klimmzug), 0,64 = etwa zwei Drittel (Liegestütz).
   *
   * null heisst: läuft über Wiederholungen statt über Last. So bei
   * gehaltenen Übungen — bei einer Plank ist „Last mal Wiederholungen"
   * keine sinnvolle Grösse.
   */
  bodyweightFactor: number | null;
  defaultBlock: TrainingBlock;
  /** Coaching-Ansage, erscheint beim Logging. */
  cue: string | null;
  /**
   * Aufbau: Bankwinkel, Griffbreite, Standbreite.
   * Nicht dasselbe wie `cue` — das ist Coaching-Sprache, das hier ist
   * die Einstellung. Wer die Bank auf 30 statt 45 Grad stellt, macht
   * eine andere Übung, landet aber in derselben Zeile der Historie.
   */
  setup: string | null;
  /** Typischer Fehler und Korrektur. */
  commonFault: string | null;
  isBodyweight: boolean;
  /** Try-This-Leiter: leichtere bzw. schwerere Variante desselben Musters. */
  regressionOfId: UUID | null;
  progressionOfId: UUID | null;
  createdAt: ISODateTime;
}

/** Ein Slot im Plan — Muster und Block stehen fest, die Übung ist tauschbar. */
export interface PlanSlot {
  id: UUID;
  planDayId: UUID;
  position: number;
  /** null bei Rumpfarbeit — die laeuft ohne Musterkurve. */
  pattern: MovementPattern | null;
  /** Vorgabe des Trainers für diesen Platz. null = offen. */
  muscleGroup: MuscleGroup | null;
  block: TrainingBlock;
  /** Anzeigename, z. B. "Oberkörper drücken". */
  label: string;
  /** Vorschlag des Coaches; der Athlet darf im Slot tauschen. */
  defaultExerciseId: UUID | null;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  /** Gruppiert Supersätze: gleicher Buchstabe = zusammen ausführen. */
  supersetGroup: string | null;
  /** Vier Ziffern, z. B. "3111": exzentrisch, unten, konzentrisch, oben. */
  tempo: string | null;
  /** Satzpause in Sekunden. */
  restSeconds: number | null;
  note: string | null;
}

export interface PlanDay {
  id: UUID;
  planId: UUID;
  position: number;
  title: string;
  /** true = mit dem Trainer, false = allein. */
  isGuided: boolean;
  /**
   * ISO-Wochentage 1=Montag bis 7=Sonntag, aufsteigend und doppelfrei.
   * Leer = ohne festen Tag.
   *
   * Eine Liste, weil derselbe Trainingstag mehrmals pro Woche liegen
   * darf: Ober montags und donnerstags. Ein zweiter Plantag mit
   * denselben Slots waere eine zweite Historie fuer dasselbe Training.
   */
  weekdays: number[];
  slots: PlanSlot[];
}

/** Vorlage des Coaches — mehrfach verwendbar. */
export interface Template {
  id: UUID;
  coachId: UUID;
  name: string;
  level: ExperienceLevel;
  description: string | null;
  /** Von PTHREE mitgeliefert (aus Joëls Buch) und nicht löschbar. */
  isSystem: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** Einem Klienten zugewiesener Plan, meist aus einer Vorlage erzeugt. */
export interface Plan {
  id: UUID;
  coachId: UUID;
  clientId: UUID;
  templateId: UUID | null;
  name: string;
  level: ExperienceLevel;
  startsOn: ISODate;
  endsOn: ISODate | null;
  isActive: boolean;
  days: PlanDay[];
  createdAt: ISODateTime;
}

export interface LoggedSet {
  id: UUID;
  sessionSlotId: UUID;
  setNumber: number;
  /**
   * Zusatzgewicht in Kilogramm.
   *
   * Bei Hantelübungen ist das die ganze Last. Bei Körpergewichtsübungen
   * nur das, was am Gürtel hängt — den Körperanteil trägt
   * `bodyLoadKg`.
   */
  weightKg: number;
  reps: number;
  isBodyweight: boolean;
  /**
   * Bewegter Körperanteil in Kilogramm, festgehalten zum Zeitpunkt des
   * Satzes. null = unbekannt, dann zählt nur `weightKg`.
   *
   * Gespeichert statt gerechnet: Sonst würde eine spätere Korrektur des
   * Faktors — oder ein Gewichtsverlust des Athleten — die ganze Historie
   * rückwirkend umschreiben.
   */
  bodyLoadKg: number | null;
  /**
   * Reps in Reserve: wie viele Wiederholungen wären noch gegangen.
   * 0 heißt bis zum Muskelversagen. Greifbarer als eine RPE-Skala.
   */
  rir: number | null;
}

export interface SessionSlot {
  id: UUID;
  sessionId: UUID;
  /** Herkunft im Plan; null bei freiem Training. */
  planSlotId: UUID | null;
  /** null bei Rumpfarbeit — die laeuft ohne Musterkurve. */
  pattern: MovementPattern | null;
  /**
   * Womit der Satz verbucht wurde. Festgehalten statt bei der Anzeige
   * aus der Übung gelesen: Sortiert jemand die Bibliothek später um,
   * soll das die Historie nicht rückwirkend umschreiben.
   */
  muscleGroup: MuscleGroup | null;
  block: TrainingBlock;
  /** Tatsächlich ausgeführte Übung — kann vom Plan abweichen. */
  exerciseId: UUID;
  position: number;
  sets: LoggedSet[];
}

export interface Session {
  id: UUID;
  clientId: UUID;
  coachId: UUID;
  planId: UUID | null;
  planDayId: UUID | null;
  title: string;
  performedAt: ISODateTime;
  /** Vom Athleten ohne Coach-Vorgabe durchgeführt. */
  /** true = ohne Plan trainiert. Sagt nichts darüber, wer erfasst hat. */
  isSelfDirected: boolean;
  /**
   * Coach, der die Einheit eingetragen hat. null = der Athlet selbst.
   *
   * Nicht dasselbe wie `isSelfDirected`: Ein Trainer kann eine freie
   * Einheit erfassen, ein Athlet kann einem Plan allein folgen.
   */
  recordedBy: UUID | null;
  /** Tatsächliche Dauer, aus der mitlaufenden Uhr. */
  durationSeconds: number | null;
  /**
   * false, wenn geplante Sätze leer geblieben sind.
   * "Unvollständig" und "nicht passiert" sind zwei verschiedene Dinge —
   * für ein Qualitätswerkzeug darf man das nicht vermischen.
   */
  isComplete: boolean;
  notes: string | null;
  slots: SessionSlot[];
}
