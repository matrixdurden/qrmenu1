import assert from "node:assert/strict";
import test from "node:test";
import { defaultSectionConfig, localizedSectionConfig, parseSectionConfig } from "./sections";

test("section parser drops unsafe shapes and limits items", () => {
  const parsed = parseSectionConfig({ title: "  Galeri  ", items: Array.from({ length: 40 }, (_, index) => ({ title: `#${index}` })) });
  assert.equal(parsed.title, "Galeri");
  assert.equal(parsed.items?.length, 24);
});

test("localized section config falls back to base items", () => {
  const localized = localizedSectionConfig({ title: "Duyuru", items: [{ title: "A" }], translations: { "en-US": { title: "News" } } }, "en-US");
  assert.equal(localized.title, "News");
  assert.equal(localized.items?.[0]?.title, "A");
});

test("default configs are usable", () => {
  assert.equal(defaultSectionConfig("featured").title, "Öne çıkanlar");
  assert.deepEqual(defaultSectionConfig("gallery").items, []);
});
