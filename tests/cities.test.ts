import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CITIES_BY_COUNTRY,
  US_CITIES_BY_STATE,
  filterCityEntries,
  filterUsStates,
  formatUsDestinationCity,
  getCitiesForCountry,
  getCitiesForUsState,
  getUsStates,
  isUsCountry,
} from "../src/constants/cities";

const EXPECTED_COUNTRY_CODES = [
  "TR", "DE", "GB", "US", "CA", "NL", "FR", "IT", "ES", "AT", "BE", "CH", "PL", "CZ", "AU", "IE", "AE", "JP", "KR",
  "CY", "TR-NC", "GR", "BG", "RO", "RU", "UA", "CN", "IN", "AL", "AD", "AM", "AZ", "BY", "BA", "HR", "DK", "EE",
  "FI", "GE", "HU", "IS", "XK", "LV", "LI", "LT", "LU", "MT", "MD", "MC", "ME", "MK", "NO", "PT", "SM", "RS", "SK",
  "SI", "SE", "VA",
];

describe("cities data", () => {
  it("covers all curated country codes", () => {
    for (const code of EXPECTED_COUNTRY_CODES) {
      assert.ok(code in CITIES_BY_COUNTRY, `missing country code ${code}`);
    }
  });

  it("includes all 81 Turkish provinces", () => {
    assert.equal(getCitiesForCountry("TR").length, 81);
    assert.ok(getCitiesForCountry("TR").some((city) => city.name === "Istanbul"));
  });

  it("uses empty list for US in CITIES_BY_COUNTRY and state-level US cities", () => {
    assert.equal(getCitiesForCountry("US").length, 0);
    assert.equal(getUsStates().length, 50);
    assert.ok(getCitiesForUsState("TX").some((city) => city.name === "Austin"));
  });

  it("filters cities and states by query", () => {
    assert.ok(filterCityEntries(getCitiesForCountry("DE"), "munich").some((city) => city.name === "Munich"));
    assert.ok(filterUsStates(getUsStates(), "texas").some((state) => state.code === "TX"));
  });

  it("formats US destination city", () => {
    assert.equal(formatUsDestinationCity("Austin", "tx"), "Austin, TX");
    assert.ok(isUsCountry("US"));
  });

  it("has thousands of offline cities total", () => {
    const countryTotal = Object.values(CITIES_BY_COUNTRY).reduce((sum, cities) => sum + cities.length, 0);
    const usTotal = Object.values(US_CITIES_BY_STATE).reduce((sum, cities) => sum + cities.length, 0);
    assert.ok(countryTotal + usTotal >= 3000);
  });
});
