import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SECTION_KEYS,
  resolveSections,
  type StoredSection,
  SECTION_TAB,
  CLIENT_TABS,
  parseView,
} from "./sections";
import { de } from "../../../i18n/de";
import { en } from "../../../i18n/en";

const gespeichert = (
  section: string,
  position: number,
  isVisible = true,
): StoredSection => ({ section, position, isVisible });

describe("resolveSections", () => {
  it("nichts gespeichert: Standardanordnung, alles sichtbar", () => {
    const out = resolveSections([]);
    assert.deepEqual(
      out.map((s) => s.key),
      SECTION_KEYS,
    );
    assert.ok(out.every((s) => s.isVisible));
  });

  it("gespeicherte Reihenfolge gewinnt", () => {
    const out = resolveSections([
      gespeichert("sessions", 1),
      gespeichert("goal", 2),
      gespeichert("insights", 3),
      gespeichert("checkins", 4),
      gespeichert("progress", 5),
      gespeichert("body", 6),
      gespeichert("volume", 7),
    ]);
    assert.deepEqual(out.slice(0, 2).map((s) => s.key), [
      "sessions",
      "goal",
    ]);
  });

  it("sortiert nach position, nicht nach Reihenfolge der Zeilen", () => {
    // Die Datenbank liefert normalerweise sortiert, aber darauf zu
    // bauen hiesse, sich auf eine order-by-Klausel in einer anderen
    // Datei zu verlassen.
    const out = resolveSections([
      gespeichert("volume", 9),
      gespeichert("goal", 1),
      gespeichert("sessions", 5),
    ]);
    assert.deepEqual(out.slice(0, 3).map((s) => s.key), [
      "goal",
      "sessions",
      "volume",
    ]);
  });

  it("abgewaehlte Abschnitte bleiben in der Liste, nur unsichtbar", () => {
    // Sie muessen im Dialog auftauchen — sonst koennte man sie nie
    // wieder einschalten.
    const out = resolveSections([gespeichert("insights", 1, false)]);
    const insights = out.find((s) => s.key === "insights")!;
    assert.equal(insights.isVisible, false);
    assert.equal(out.length, SECTION_KEYS.length);
  });

  it("NEUER Abschnitt taucht bei alten Einstellungen auf", () => {
    // Der wichtigste Fall. Wer vor einem halben Jahr etwas eingestellt
    // hat, darf nicht dauerhaft von allem Neuen abgeschnitten sein —
    // und wuerde den Fehler nie melden, weil er nicht weiss, dass es
    // etwas gibt.
    const alt = resolveSections([
      gespeichert("goal", 1),
      gespeichert("insights", 2),
    ]);
    assert.equal(alt.length, SECTION_KEYS.length);
    for (const key of SECTION_KEYS) {
      const eintrag = alt.find((s) => s.key === key);
      assert.ok(eintrag, `${key} fehlt`);
    }
    // Neue haengen hinten an und sind sichtbar.
    assert.ok(alt.slice(2).every((s) => s.isVisible));
  });

  it("unbekannter Schluessel wird still uebergangen", () => {
    // Ein Abschnitt, den es nicht mehr gibt. Wuerde sonst einen leeren
    // Platz in der Akte erzeugen.
    const out = resolveSections([
      gespeichert("kaffeemaschine", 1),
      gespeichert("goal", 2),
    ]);
    assert.ok(!out.some((s) => String(s.key) === "kaffeemaschine"));
    assert.equal(out[0]!.key, "goal");
    assert.equal(out.length, SECTION_KEYS.length);
  });

  it("nie doppelte Schluessel", () => {
    const out = resolveSections([
      gespeichert("goal", 1),
      gespeichert("goal", 2),
    ]);
    const keys = out.map((s) => s.key);
    assert.equal(new Set(keys).size, keys.length);
  });
});

describe("Beschriftung", () => {
  it("jeder Schluessel hat in beiden Sprachen Name und Erklärung", () => {
    // Ein neuer Abschnitt ohne Eintrag fiele sonst erst im Browser auf —
    // tsc fängt fehlende Schlüssel in `en` nur, wenn `de` ihn hat.
    for (const d of [de, en]) {
      for (const key of SECTION_KEYS) {
        assert.ok(d.coach.sections[key]?.label, `${key}: label`);
        assert.ok(d.coach.sections[key]?.hint, `${key}: hint`);
      }
    }
  });
});

describe("Reiter", () => {
  it("jeder Abschnitt gehört zu einem bekannten Reiter", () => {
    for (const key of SECTION_KEYS) {
      assert.ok(CLIENT_TABS.includes(SECTION_TAB[key]), key);
    }
  });
  it("jeder Reiter hat mindestens einen Abschnitt", () => {
    // Ein leerer Reiter wäre ein Knopf, der ins Nichts führt.
    for (const tab of CLIENT_TABS) {
      assert.ok(SECTION_KEYS.some((k) => SECTION_TAB[k] === tab), tab);
    }
  });
  it("unbekannte Adresse fällt auf Tracken", () => {
    assert.equal(parseView(undefined), "track");
    assert.equal(parseView("quatsch"), "track");
    assert.equal(parseView("progress"), "progress");
    assert.equal(parseView("manage"), "manage");
  });
});
