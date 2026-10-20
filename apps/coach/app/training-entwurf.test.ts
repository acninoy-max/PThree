import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LUECKE_ALS_PAUSE_MS,
  MAX_ALTER_MS,
  entwurfSchluessel,
  entwurfUmfang,
  entwurfZuSlots,
  ladeEntwurf,
  pausenBeimFortsetzen,
  sichereEntwurf,
  slotsZuEntwurf,
  verwirfEntwurf,
  type Speicher,
  type TrainingsEntwurf,
} from "./training-entwurf";

function speicher(): Speicher & { daten: Map<string, string> } {
  const daten = new Map<string, string>();
  return {
    daten,
    getItem: (k) => daten.get(k) ?? null,
    setItem: (k, v) => void daten.set(k, v),
    removeItem: (k) => void daten.delete(k),
  };
}

const T0 = 1_760_000_000_000;
const bank = { id: "bank" };
const rudern = { id: "rudern" };
const slotA = { id: "slot-a" };

function entwurf(): Omit<TrainingsEntwurf, "v"> {
  return {
    gespeichertAm: T0,
    begonnenAm: T0 - 600_000,
    dayId: "tag-a",
    dayTitle: "Day A",
    slots: slotsZuEntwurf([
      {
        key: "k1",
        exercise: bank,
        plan: slotA,
        sets: [
          { weight: "80", reps: "8", rir: "2" },
          { weight: "80", reps: "", rir: "" },
        ],
      },
      { key: "k2", exercise: rudern, plan: null, sets: [{ weight: "60", reps: "10", rir: "" }] },
    ]),
    breaks: [],
  };
}

describe("Training-Entwurf", () => {
  it("Schlüssel trennen Konten und Klienten", () => {
    assert.notEqual(entwurfSchluessel("athlet", "u1"), entwurfSchluessel("athlet", "u2"));
    assert.notEqual(
      entwurfSchluessel("trainer", "c1", "k1"),
      entwurfSchluessel("trainer", "c1", "k2"),
    );
  });

  it("speichert, liest zurück und stellt die Maske wieder her", () => {
    const s = speicher();
    assert.equal(sichereEntwurf(s, "k", entwurf()), true);
    const e = ladeEntwurf(s, "k", T0 + 1000);
    assert.ok(e);
    assert.deepEqual(entwurfUmfang(e), { uebungen: 2, saetze: 2 });
    const slots = entwurfZuSlots(e, [bank, rudern], [slotA]);
    assert.equal(slots.length, 2);
    assert.equal(slots[0]!.plan, slotA);
    assert.equal(slots[0]!.sets[0]!.weight, "80");
    assert.equal(slots[1]!.plan, null);
  });

  it("unbekannte Übung fällt heraus, unbekannter Plan-Slot wird frei", () => {
    const s = speicher();
    sichereEntwurf(s, "k", entwurf());
    const e = ladeEntwurf(s, "k", T0)!;
    const slots = entwurfZuSlots(e, [bank], []);
    assert.equal(slots.length, 1);
    assert.equal(slots[0]!.plan, null);
  });

  it("zu alt, kaputt oder falsche Fassung: weg und gelöscht", () => {
    const s = speicher();
    sichereEntwurf(s, "alt", entwurf());
    assert.equal(ladeEntwurf(s, "alt", T0 + MAX_ALTER_MS + 1), null);
    assert.equal(s.daten.has("alt"), false);

    s.setItem("kaputt", "{nicht json");
    assert.equal(ladeEntwurf(s, "kaputt", T0), null);
    assert.equal(s.daten.has("kaputt"), false);

    s.setItem("fassung", JSON.stringify({ ...entwurf(), v: 999 }));
    assert.equal(ladeEntwurf(s, "fassung", T0), null);
  });

  it("ohne Speicher oder wenn er wirft: kein Absturz", () => {
    assert.equal(ladeEntwurf(null, "k", T0), null);
    assert.equal(sichereEntwurf(null, "k", entwurf()), false);
    const wirft: Speicher = {
      getItem: () => {
        throw new Error("privat");
      },
      setItem: () => {
        throw new Error("voll");
      },
      removeItem: () => {
        throw new Error("privat");
      },
    };
    assert.equal(sichereEntwurf(wirft, "k", entwurf()), false);
    assert.equal(ladeEntwurf(wirft, "k", T0), null);
    verwirfEntwurf(wirft, "k");
  });

  it("verwerfen löscht", () => {
    const s = speicher();
    sichereEntwurf(s, "k", entwurf());
    verwirfEntwurf(s, "k");
    assert.equal(ladeEntwurf(s, "k", T0), null);
  });

  it("lange Lücke wird Pause, kurze nicht, offene Pause endet", () => {
    const e = { v: 1, ...entwurf() };
    assert.deepEqual(pausenBeimFortsetzen(e, T0 + 60_000), []);
    const lang = pausenBeimFortsetzen(e, T0 + LUECKE_ALS_PAUSE_MS + 1);
    assert.deepEqual(lang, [{ von: T0, bis: T0 + LUECKE_ALS_PAUSE_MS + 1 }]);
    const offen = { ...e, breaks: [{ von: T0 - 1000, bis: null }] };
    assert.deepEqual(pausenBeimFortsetzen(offen, T0 + 5000), [{ von: T0 - 1000, bis: T0 + 5000 }]);
    // Der Entwurf selbst bleibt unverändert.
    assert.equal(offen.breaks[0]!.bis, null);
  });
});
