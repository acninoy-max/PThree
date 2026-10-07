import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickLocale } from "./locale";

describe("pickLocale", () => {
  it("das Cookie gewinnt", () => {
    assert.equal(pickLocale("de", "en-GB,en"), "de");
    assert.equal(pickLocale("en", "de-DE,de"), "en");
  });
  it("ein kaputtes Cookie zählt nicht", () => {
    assert.equal(pickLocale("fr", "de-DE,de;q=0.9"), "de");
  });
  it("niederländischer Browser landet bei Englisch", () => {
    assert.equal(pickLocale(undefined, "nl-NL,nl;q=0.9,en;q=0.8,de;q=0.7"), "en");
  });
  it("deutscher Browser landet bei Deutsch", () => {
    assert.equal(pickLocale(undefined, "de-DE,de;q=0.9,en;q=0.8"), "de");
  });
  it("ohne alles: Englisch", () => {
    assert.equal(pickLocale(undefined, null), "en");
    assert.equal(pickLocale(undefined, "fr-FR,fr"), "en");
  });
});
