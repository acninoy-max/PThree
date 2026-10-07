/** Beschriftungen für Aufzählungen aus der Datenbank. */
import type {
  AppointmentStatus,
  ExperienceLevel,
  MovementPattern,
  MuscleGroup,
  TrainingBlock,
} from "@ptfive/types";

export const labels = {
  muscle: {
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
  } satisfies Record<MuscleGroup, string> as Record<MuscleGroup, string>,
  /** Leere Muskelgruppe — ein Slot, der noch keine hat. */
  muscleOpen: "offen",
  /** „Brust · auch Trizeps" */
  muscleAlso: "auch",
  pattern: {
    push: "Oberkörper drücken",
    pull: "Oberkörper ziehen",
    squat: "Unterkörper drücken",
    hinge: "Hüftbeuge",
    overhead: "Über Kopf drücken",
  } satisfies Record<MovementPattern, string> as Record<MovementPattern, string>,
  /** Kein Muster: Rumpfarbeit. */
  patternCore: "Rumpf",
  block: {
    compound: "Grundübung",
    functional: "Funktionell",
    isolation: "Isolation",
    core: "Rumpf",
  } satisfies Record<TrainingBlock, string> as Record<TrainingBlock, string>,
  level: {
    beginner: "Einsteiger",
    intermediate: "Fortgeschritten",
    pro: "Profi",
  } satisfies Record<ExperienceLevel, string> as Record<ExperienceLevel, string>,
  /**
   * Zu jedem Maß eine Anleitung in einem Satz.
   *
   * Das ist nicht Deko: Taille am Bauchnabel oder an der schmalsten
   * Stelle unterscheidet sich um drei bis fünf Zentimeter. Misst der
   * Athlet jede Woche anders, ist der „Fortschritt" nur Rauschen.
   */
  measure: {
    shoulders: {
      label: "Schultern",
      how: "Um die breiteste Stelle, Arme locker hängen lassen.",
    },
    chest: {
      label: "Brust",
      how: "Auf Brustwarzenhöhe, am Ende einer normalen Ausatmung.",
    },
    waist: { label: "Taille", how: "Auf Höhe des Bauchnabels, nicht einziehen." },
    arm: {
      label: "Oberarm",
      how: "Rechter Arm, angespannt, an der dicksten Stelle.",
    },
    thigh: {
      label: "Oberschenkel",
      how: "Rechtes Bein, eine Handbreit unter dem Schritt.",
    },
  },
  weight: "Gewicht",
  pose: { front: "Vorne", side: "Seite", back: "Hinten" },
  location: {
    gym: "Studio",
    park: "Park",
    home: "Zuhause",
    online: "Online",
  } as Record<string, string>,
  /** Trainersicht. Der Athlet liest „Verpasst" statt „No-Show". */
  apptStatus: {
    scheduled: "Geplant",
    completed: "Stattgefunden",
    rescheduled: "Verschoben",
    cancelled: "Abgesagt",
    no_show: "No-Show",
  } satisfies Record<AppointmentStatus, string> as Record<AppointmentStatus, string>,
  clientStatus: {
    active: "Aktiv",
    paused: "Pausiert",
    archived: "Archiviert",
  },
  insightKind: {
    plateau: "Plateau",
    inactive: "Inaktiv",
    progress: "Fortschritt",
  },
};
