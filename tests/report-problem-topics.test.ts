import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  SUPPORT_TOPIC_LABELS,
  SUPPORT_TOPIC_OPTIONS,
} from "../src/features/profile/constants/supportTopics";
import { validateReportProblemForm } from "../src/features/profile/utils/reportProblemForm";

const readSource = (relativePath: string) =>
  readFileSync(join(process.cwd(), relativePath), "utf8");

describe("support topic options", () => {
  it("exposes the existing real topics with unique values", () => {
    const values = SUPPORT_TOPIC_OPTIONS.map((option) => option.value);

    assert.deepEqual(values, ["login_access", "messages", "events", "help_requests", "other"]);
    assert.equal(new Set(values).size, values.length);
  });

  it("maps every topic value to its submit label", () => {
    for (const option of SUPPORT_TOPIC_OPTIONS) {
      assert.equal(SUPPORT_TOPIC_LABELS[option.value], option.label);
    }
  });
});

describe("report problem form validation", () => {
  it("rejects submission without a selected topic", () => {
    const result = validateReportProblemForm({ topic: null, message: "Uygulama açılmıyor" });

    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.error === "topic");
    assert.ok(!result.ok && result.title === "Konu seçin");
  });

  it("rejects submission with an empty message", () => {
    const result = validateReportProblemForm({ topic: "messages", message: "   " });

    assert.equal(result.ok, false);
    assert.ok(!result.ok && result.error === "message");
  });

  it("returns the topic and trimmed message for the submit payload", () => {
    const result = validateReportProblemForm({
      topic: "events",
      message: "  Etkinliğe katılamıyorum  ",
    });

    assert.ok(result.ok);
    assert.equal(result.ok && result.topic, "events");
    assert.equal(result.ok && result.message, "Etkinliğe katılamıyorum");
  });
});

describe("ReportProblemScreen topic selection", () => {
  it("passes onPress directly to ListItem instead of nesting Pressables", () => {
    const source = readSource("src/features/profile/screens/ReportProblemScreen.tsx");

    assert.match(source, /<ListItem\s+key=\{topic\.value\}\s+onPress=\{\(\) => setSelectedTopic\(topic\.value\)\}/);
    // The old broken pattern wrapped the (already pressable) ListItem in an
    // outer Pressable, which swallowed taps on iOS.
    assert.doesNotMatch(source, /<Pressable[^>]*>\s*<ListItem/);
  });

  it("shows a selected state and validates via the shared helper", () => {
    const source = readSource("src/features/profile/screens/ReportProblemScreen.tsx");

    assert.match(source, /const isSelected = selectedTopic === topic\.value/);
    assert.match(source, /isSelected \?/);
    assert.match(source, /validateReportProblemForm\(\{ topic: selectedTopic, message \}\)/);
    assert.match(source, /submitSupportReport\(\{ topic: validation\.topic, message: validation\.message \}\)/);
  });
});
