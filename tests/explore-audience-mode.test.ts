import assert from "node:assert/strict";
import test from "node:test";
import type { ExploreFeedScope } from "../src/features/explore/types";
import {
  buildExploreFeedQueryParams,
  buildLoadExploreFeedInput,
  reduceExploreViewState,
} from "../src/features/explore/services/audienceMode";

const context = {
  community: "Turkish",
  countryCode: "DE",
  city: "Berlin",
};

const buildInput = (scope: ExploreFeedScope, audienceMode: "community" | "global") =>
  buildLoadExploreFeedInput({
    scope,
    audienceMode,
    context,
  });

test("Your community + City sends community param", () => {
  const input = buildInput("city", "community");
  const params = buildExploreFeedQueryParams(input);
  assert.equal(params.get("scope"), "city");
  assert.equal(params.get("community"), "Turkish");
});

test("Global + City does not send community param", () => {
  const input = buildInput("city", "global");
  const params = buildExploreFeedQueryParams(input);
  assert.equal(params.get("scope"), "city");
  assert.equal(params.has("community"), false);
});

test("Your community + Country sends community param", () => {
  const input = buildInput("country", "community");
  const params = buildExploreFeedQueryParams(input);
  assert.equal(params.get("scope"), "country");
  assert.equal(params.get("community"), "Turkish");
});

test("Global + Country does not send community param", () => {
  const input = buildInput("country", "global");
  const params = buildExploreFeedQueryParams(input);
  assert.equal(params.get("scope"), "country");
  assert.equal(params.has("community"), false);
});

test("Switching audienceMode changes effective feed request", () => {
  const cityCommunity = buildExploreFeedQueryParams(buildInput("city", "community")).toString();
  const cityGlobal = buildExploreFeedQueryParams(buildInput("city", "global")).toString();
  assert.notEqual(cityCommunity, cityGlobal);
});

test("Switching City/Country keeps selected audienceMode", () => {
  const initialState = { scope: "city" as ExploreFeedScope, audienceMode: "global" as const };
  const nextState = reduceExploreViewState(initialState, { type: "set_scope", scope: "country" });
  assert.equal(nextState.audienceMode, "global");
  assert.equal(nextState.scope, "country");
});
