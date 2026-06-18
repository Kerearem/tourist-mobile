import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { COUNTRIES, filterCountries, getCountryByCode } from "../src/constants/countries";
import { getCountryFlagEmoji, getCountryFlagImageUrl, hasCountryFlagImage } from "../src/utils/countryFlag";

describe("countries", () => {
  it("contains the full curated country list", () => {
    assert.equal(COUNTRIES.length, 59);
  });

  it("resolves standard ISO codes", () => {
    assert.equal(getCountryByCode("tr")?.labelTr, "Türkiye");
    assert.equal(getCountryByCode("DE")?.labelEn, "Germany");
  });

  it("resolves TR-NC without breaking on uppercase", () => {
    assert.equal(getCountryByCode("tr-nc")?.code, "TR-NC");
    assert.equal(getCountryByCode("TR-NC")?.labelTr, "Kuzey Kıbrıs");
  });

  it("filters by Turkish and English labels", () => {
    assert.ok(filterCountries("almanya", "tr").some((c) => c.code === "DE"));
    assert.ok(filterCountries("germany", "en").some((c) => c.code === "DE"));
    assert.ok(filterCountries("kuzey", "tr").some((c) => c.code === "TR-NC"));
  });
});

describe("country flags", () => {
  it("provides image URL for standard codes", () => {
    assert.equal(getCountryFlagImageUrl("TR"), "https://flagcdn.com/w160/tr.png");
    assert.ok(hasCountryFlagImage("DE"));
  });

  it("provides image URL for TR-NC", () => {
    assert.ok(getCountryFlagImageUrl("TR-NC")?.includes("Northern_Cyprus"));
  });

  it("provides emoji fallback", () => {
    assert.equal(getCountryFlagEmoji("TR"), "🇹🇷");
    assert.equal(getCountryFlagEmoji("TR-NC"), "🇹🇷");
  });
});
