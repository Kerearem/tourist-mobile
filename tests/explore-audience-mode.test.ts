import assert from "node:assert/strict";
import test from "node:test";
import type { ExploreFeedScope } from "../src/features/explore/types";
import {
  buildExploreFeedQueryParams,
  buildLoadExploreFeedInput,
  reduceExploreViewState,
} from "../src/features/explore/services/audienceMode";

const buildInput = (scope: ExploreFeedScope, audienceMode: "community" | "global") =>
  buildLoadExploreFeedInput({
    scope,
    audienceMode,
  });

test("Your community + City sends nationality identity scope", () => {
  const input = buildInput("city", "community");
  const params = buildExploreFeedQueryParams(input);
  assert.equal(params.get("locationScope"), "city");
  assert.equal(params.get("identityScope"), "nationality");
});

test("Global + City sends everyone identity scope", () => {
  const input = buildInput("city", "global");
  const params = buildExploreFeedQueryParams(input);
  assert.equal(params.get("locationScope"), "city");
  assert.equal(params.get("identityScope"), "everyone");
});

test("Your community + Country sends nationality identity scope", () => {
  const input = buildInput("country", "community");
  const params = buildExploreFeedQueryParams(input);
  assert.equal(params.get("locationScope"), "country");
  assert.equal(params.get("identityScope"), "nationality");
});

test("Global + Country sends everyone identity scope", () => {
  const input = buildInput("country", "global");
  const params = buildExploreFeedQueryParams(input);
  assert.equal(params.get("locationScope"), "country");
  assert.equal(params.get("identityScope"), "everyone");
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
