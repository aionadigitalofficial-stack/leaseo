import assert from "node:assert/strict";
import test from "node:test";
import { classifyBhashSmsOutcome } from "./sms-delivery-status";

test("a timeout before any HTTP response is reported as unknown", () => {
  assert.equal(classifyBhashSmsOutcome(undefined, false, true), "unknown");
});

test("explicit provider HTTP errors and non-accepted replies remain failures", () => {
  assert.equal(classifyBhashSmsOutcome(503, false), "failed");
  assert.equal(classifyBhashSmsOutcome(200, false), "failed");
});

test("a recognized provider acceptance remains accepted", () => {
  assert.equal(classifyBhashSmsOutcome(200, true), "accepted");
});
