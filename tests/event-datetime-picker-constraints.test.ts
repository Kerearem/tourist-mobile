import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildHourValues,
  buildMinuteValues,
} from "../src/features/events/utils/eventDateTimePickerConstraints";
import { resolveEndDateAfterStartChange } from "../src/features/events/utils/eventCreationValidation";

describe("event datetime picker constraints", () => {
  const minimumDate = new Date(2026, 6, 12, 10, 30, 0, 0);

  it("hides past hours on the minimum day", () => {
    const hours = buildHourValues(2026, 7, 12, minimumDate);
    assert.deepEqual(hours, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
    assert.equal(hours.includes(9), false);
  });

  it("allows all hours on a later day", () => {
    const hours = buildHourValues(2026, 7, 13, minimumDate);
    assert.equal(hours.length, 24);
    assert.equal(hours[0], 0);
  });

  it("hides past minutes on the minimum hour", () => {
    const minutes = buildMinuteValues(2026, 7, 12, 10, minimumDate);
    assert.equal(minutes[0], 30);
    assert.equal(minutes.includes(29), false);
  });

  it("allows all minutes on a later hour", () => {
    const minutes = buildMinuteValues(2026, 7, 12, 11, minimumDate);
    assert.equal(minutes.length, 60);
    assert.equal(minutes[0], 0);
  });

  it("moves end forward when start exceeds end", () => {
    const start = new Date("2026-08-01T18:00:00.000Z");
    const end = new Date("2026-08-01T19:00:00.000Z");
    const nextEnd = resolveEndDateAfterStartChange(new Date("2026-08-01T20:00:00.000Z"), end);
    assert.equal(nextEnd > new Date("2026-08-01T20:00:00.000Z"), true);
  });
});
