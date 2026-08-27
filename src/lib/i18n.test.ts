import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLocales, uiCopy } from "./i18n";

test("normalizeLocales keeps default first and removes duplicates", () => {
  assert.deepEqual(normalizeLocales("tr-TR", ["en-US", "tr-TR", "en-US"]), ["tr-TR", "en-US"]);
});

test("normalizeLocales rejects malformed locale values", () => {
  assert.deepEqual(normalizeLocales("tr-TR", ["javascript:alert(1)", "en-US"]), ["tr-TR", "en-US"]);
});

test("ui copy selects english family", () => {
  assert.equal(uiCopy("en-GB").soldOut, "Sold out");
  assert.equal(uiCopy("tr-TR").soldOut, "Tükendi");
});
