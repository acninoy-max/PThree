import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SECTION_KEYS,
  SECTION_TAB,
  CLIENT_TABS,
  parseView,
} from "./sections";
import { de } from "../../../i18n/de";
import { en } from "../../../i18n/en";

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
