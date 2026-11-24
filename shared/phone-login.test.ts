import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLoginMobile, phoneLoginSchema } from "./phone-login";

test("normalizes pasted and autofilled Indian mobile numbers without losing digits", () => {
  for (const [input, expected] of [
    ["9876543210", "9876543210"],
    ["+91 98765 43210", "9876543210"],
    ["919876543210", "9876543210"],
    ["(+91) 98765-43210", "9876543210"],
    ["09876543210", "9876543210"],
    [" 9123456789 ", "9123456789"],
    ["+91 61234 56789", "6123456789"],
  ]) {
    const phone = normalizeLoginMobile(input);
    assert.equal(phone, expected, input);
    assert.equal(phoneLoginSchema.safeParse({ phone, code: "000000" }).success, true);
  }
});

test("rejects ambiguous or invalid phone numbers rather than truncating them", () => {
  for (const input of [
    "", "987654321", "98765432100", "987654321000", "+1 9876543210",
    "+91 5123456789", "9876543210 ext 42", "++91 9876543210",
  ]) {
    assert.equal(normalizeLoginMobile(input), null, input);
  }
});
