import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Client, LoggedSet, Session, SessionSlot } from "@ptfive/types";
import { MOVEMENT_PATTERNS } from "@ptfive/types";
import { analyseClient, detectInactivity, detectPlateaus } from "./insights";
import {
  bestSet,
  comparableScores,
  estimateOneRepMax,
  patternHistory,
} from "./metrics";

const COACH = "coach-1";
const CLIENT = "client-1";
const NOW = new Date("2026-08-21T10:00:00Z");

function client(overrides: Partial<Client> = {}): Client {
  return {
    id: CLIENT,
    coachId: COACH,
    organisationId: "org-1",
    profileId: null,
    fullName: "Lisa V.",
    email: null,
    birthDate: null,
    avatarPath: null,
    status: "active",
    level: "intermediate",
    goal: null,
    startedOn: "2026-05-01",
    createdAt: "2026-05-01T09:00:00Z",
    ...overrides,
  };
}

function set(
  weightKg: number,
  reps: number,
  bodyweight = false,
  bodyLoadKg: number | null = null,
): LoggedSet {
  return {
    id: `set-${Math.random()}`,
    sessionSlotId: "slot",
    setNumber: 1,
    weightKg,
    bodyLoadKg,
    reps,
    isBodyweight: bodyweight,
    rir: null,
  };
}

function slot(
  pattern: SessionSlot["pattern"],
  exerciseId: string,
  sets: LoggedSet[],
): SessionSlot {
  return {
    id: `slot-${Math.random()}`,
    sessionId: "s",
    planSlotId: null,
    pattern,
    // Die Muskelgruppe spielt für die Musterkurven keine Rolle — die
    // Engine rechnet weiter über das Muster.
    muscleGroup: null,
    block: "compound",
    exerciseId,
    position: 1,
    sets,
  };
}

function session(daysAgo: number, slots: SessionSlot[], id = `s-${daysAgo}`): Session {
  const d = new Date(NOW.getTime() - daysAgo * 86_400_000);
  return {
    id,
    clientId: CLIENT,
    coachId: COACH,
    planId: null,
    planDayId: null,
    title: "Session",
    performedAt: d.toISOString(),
    isSelfDirected: false,
    // null = der Athlet selbst hat eingetragen.
    recordedBy: null,
    durationSeconds: null,
    isComplete: true,
    notes: null,
    slots,
  };
}

describe("Kennzahlen", () => {
  it("schätzt das Einer-Maximum nach Epley", () => {
    assert.equal(Math.round(estimateOneRepMax(set(100, 5)) * 10) / 10, 116.7);
  });

  it("nutzt bei Körpergewicht die Wiederholungen als Maßstab", () => {
    assert.equal(estimateOneRepMax(set(0, 8, true)), 8);
  });

  it("findet den besten Satz auch bei ungeordneter Reihenfolge", () => {
    const best = bestSet([set(60, 10), set(90, 3), set(80, 8)]);
    assert.equal(best?.weightKg, 80); // 80x8 = 101,3 schlägt 90x3 = 99,0
  });
});

describe("Musterverlauf", () => {
  it("führt Fortschritt über einen Übungswechsel hinweg fort", () => {
    // Das ist das "1Fit-Problem": Wechsel des Werkzeugs im selben Slot
    // darf die Historie nicht abreißen lassen.
    const sessions = [
      session(20, [slot("push", "bench", [set(70, 6)])]),
      session(13, [slot("push", "bench", [set(75, 6)])]),
      session(6, [slot("push", "incline-db", [set(80, 6)])]),
    ];
    const points = patternHistory(sessions, "push");
    assert.equal(points.length, 3);
    assert.equal(points[2]?.exerciseId, "incline-db");
    assert.ok(points[2]!.score > points[0]!.score);
  });

  it("verliert selbstständige Einheiten des Athleten nicht", () => {
    const guided = session(10, [slot("squat", "back-squat", [set(100, 5)])]);
    const solo: Session = {
      ...session(5, [slot("squat", "goblet", [set(40, 12)])], "solo"),
      isSelfDirected: true,
    };
    const points = patternHistory([guided, solo], "squat");
    assert.equal(points.length, 2);
  });

  it("hält den Verlauf, wenn im Plan-Slot die Übung getauscht wird", () => {
    // Der Athlet folgt einem Plan-Slot "Oberkörper drücken". In Woche 3
    // ist die Bank belegt, er nimmt Kurzhanteln. Muster und Slot bleiben,
    // nur exercise_id ändert sich — der Verlauf darf nicht abreißen.
    const planned = (exerciseId: string, kg: number, daysAgo: number) => {
      const s = session(daysAgo, [slot("push", exerciseId, [set(kg, 6)])]);
      const slotWithPlan: SessionSlot = { ...s.slots[0]!, planSlotId: "plan-slot-1" };
      return { ...s, planId: "plan-1", planDayId: "day-a", slots: [slotWithPlan] };
    };

    const sessions = [
      planned("bench", 70, 21),
      planned("bench", 75, 14),
      planned("db-press", 78, 7),
    ];

    const points = patternHistory(sessions, "push");
    assert.equal(points.length, 3);
    // Alle drei hängen am selben Plan-Slot …
    assert.ok(sessions.every((s) => s.slots[0]?.planSlotId === "plan-slot-1"));
    // … und der Verlauf steigt trotz Übungswechsel durch.
    const scores = comparableScores(points);
    assert.equal(scores.length, 3);
    assert.ok(scores[2]! > scores[1]! && scores[1]! > scores[0]!);
    assert.equal(detectPlateaus(client(), sessions, NOW).length, 0);
  });

  it("zählt geplantes und freies Training im selben Muster zusammen", () => {
    // Plan-Einheit und freie Einheit müssen in einer Kurve landen,
    // sonst wäre die Auswertung von der Disziplin des Athleten abhängig.
    const fromPlan = session(14, [slot("hinge", "deadlift", [set(100, 5)])]);
    const planned: Session = {
      ...fromPlan,
      planId: "plan-1",
      planDayId: "day-b",
      slots: [{ ...fromPlan.slots[0]!, planSlotId: "plan-slot-9" }],
    };
    const free = session(5, [slot("hinge", "rdl", [set(90, 8)])]);

    const points = patternHistory([planned, free], "hinge");
    assert.equal(points.length, 2);
    assert.equal(comparableScores(points).length, 2);
  });

  it("lässt Rumpfarbeit aus jeder Musterkurve heraus", () => {
    // Rumpfübungen haben kein Muster. Landeten sie versehentlich in einer
    // Kurve, würde ein Plank die Kreuzheben-Zahlen flachdrücken — und genau
    // diese Kurve ist unser Alleinstellungsmerkmal.
    const core = (daysAgo: number, reps: number): Session => {
      const s = session(daysAgo, [slot("hinge", "plank", [set(0, reps, true)])]);
      return { ...s, slots: [{ ...s.slots[0]!, pattern: null, block: "core" }] };
    };

    const sessions = [
      session(21, [slot("hinge", "deadlift", [set(100, 5)])]),
      core(20, 60),
      session(14, [slot("hinge", "deadlift", [set(110, 5)])]),
      core(13, 75),
      session(7, [slot("hinge", "deadlift", [set(120, 5)])]),
    ];

    // Nur die drei Kreuzheben-Einheiten zählen.
    const points = patternHistory(sessions, "hinge");
    assert.equal(points.length, 3);
    assert.ok(points.every((p) => p.exerciseId === "deadlift"));

    // Und in keinem der fünf Muster taucht der Plank auf.
    for (const p of MOVEMENT_PATTERNS) {
      const found = patternHistory(sessions, p);
      assert.ok(
        found.every((x) => x.exerciseId !== "plank"),
        `Plank in Muster ${p} gelandet`,
      );
    }

    // Fortschritt wird trotz der dazwischenliegenden Rumpfeinheiten erkannt.
    assert.equal(detectPlateaus(client(), sessions, NOW).length, 0);
  });

  it("vermischt Körpergewicht und Zusatzlast nicht", () => {
    const sessions = [
      session(20, [slot("pull", "pullup", [set(0, 8, true)])]),
      session(10, [slot("pull", "barbell-row", [set(60, 8)])]),
      session(3, [slot("pull", "barbell-row", [set(65, 8)])]),
    ];
    const scores = comparableScores(patternHistory(sessions, "pull"));
    // Nur die beiden Hantel-Werte sind vergleichbar.
    assert.equal(scores.length, 2);
  });
});

describe("Plateau", () => {
  it("meldet Stillstand über drei Einheiten", () => {
    const sessions = [
      session(21, [slot("push", "bench", [set(72, 6)])]),
      session(14, [slot("push", "bench", [set(72, 6)])]),
      session(7, [slot("push", "bench", [set(72, 6)])]),
    ];
    const found = detectPlateaus(client(), sessions, NOW);
    assert.equal(found.length, 1);
    assert.equal(found[0]?.pattern, "push");
    assert.equal(found[0]?.severity, "flag");
    assert.ok(found[0]?.action?.includes("Volumen"));
  });

  it("meldet kein Plateau bei stetigem Zuwachs", () => {
    const sessions = [
      session(21, [slot("squat", "back-squat", [set(90, 6)])]),
      session(14, [slot("squat", "back-squat", [set(95, 6)])]),
      session(7, [slot("squat", "back-squat", [set(100, 6)])]),
    ];
    assert.equal(detectPlateaus(client(), sessions, NOW).length, 0);
  });

  it("urteilt nicht bei zu wenigen Datenpunkten", () => {
    const sessions = [session(7, [slot("push", "bench", [set(72, 6)])])];
    assert.equal(detectPlateaus(client(), sessions, NOW).length, 0);
  });
});

describe("Inaktivität", () => {
  it("meldet sich nach sechs Tagen ohne Training", () => {
    const found = detectInactivity(
      client(),
      [session(9, [slot("push", "bench", [set(70, 6)])])],
      NOW,
    );
    assert.ok(found);
    assert.equal(found?.severity, "nudge");
  });

  it("schweigt bei frischem Training", () => {
    const found = detectInactivity(
      client(),
      [session(2, [slot("push", "bench", [set(70, 6)])])],
      NOW,
    );
    assert.equal(found, null);
  });

  it("ignoriert pausierte Klienten", () => {
    const found = detectInactivity(
      client({ status: "paused" }),
      [session(30, [slot("push", "bench", [set(70, 6)])])],
      NOW,
    );
    assert.equal(found, null);
  });
});

describe("Gesamtauswertung", () => {
  it("sortiert Dringendes nach oben und meldet Plateau statt Fortschritt", () => {
    const sessions = [
      session(21, [
        slot("push", "bench", [set(72, 6)]),
        slot("squat", "back-squat", [set(90, 6)]),
      ]),
      session(14, [
        slot("push", "bench", [set(72, 6)]),
        slot("squat", "back-squat", [set(100, 6)]),
      ]),
      session(4, [
        slot("push", "bench", [set(72, 6)]),
        slot("squat", "back-squat", [set(110, 6)]),
      ]),
    ];
    const insights = analyseClient(client(), sessions, NOW);

    assert.equal(insights[0]?.severity, "flag");
    assert.equal(insights[0]?.kind, "plateau");
    assert.equal(insights[0]?.pattern, "push");

    // Squat wächst -> Fortschritt gemeldet, Push nicht doppelt bewertet.
    const pushInsights = insights.filter((i) => i.pattern === "push");
    assert.equal(pushInsights.length, 1);
    assert.ok(insights.some((i) => i.kind === "progress" && i.pattern === "squat"));
  });

  it("liefert stabile IDs für wiederholte Berechnungen", () => {
    const sessions = [
      session(21, [slot("push", "bench", [set(72, 6)])]),
      session(14, [slot("push", "bench", [set(72, 6)])]),
      session(7, [slot("push", "bench", [set(72, 6)])]),
    ];
    const a = analyseClient(client(), sessions, NOW).map((i) => i.id);
    const b = analyseClient(client(), sessions, NOW).map((i) => i.id);
    assert.deepEqual(a, b);
  });
});
