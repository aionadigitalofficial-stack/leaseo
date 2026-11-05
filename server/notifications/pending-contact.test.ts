import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  clearPendingPropertyContact, pendingPropertyContactRedirect,
  readPendingPropertyContact, savePendingPropertyContact,
} from "../../client/src/lib/pending-property-contact";

const values = new Map<string, string>();
const key = "leaseo.pending-property-contact";
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: {
    getItem: (name: string) => values.get(name) ?? null,
    setItem: (name: string, value: string) => { values.set(name, value); },
    removeItem: (name: string) => { values.delete(name); },
  },
});
beforeEach(() => values.clear());

test("consented property intent survives login without storing contact details", () => {
  savePendingPropertyContact("property-one");
  assert.equal(readPendingPropertyContact()?.consentConfirmed, true);
  assert.equal(pendingPropertyContactRedirect("?redirect=%2Fproperties%2Fproperty-one"), "/properties/property-one");
  assert.deepEqual(Object.keys(JSON.parse(values.get(key)!)).sort(),
    ["action", "consentConfirmed", "createdAt", "propertyId", "userId"]);
});

test("ordinary login and other property or external redirects are unchanged", () => {
  assert.equal(pendingPropertyContactRedirect("?redirect=/properties/property-one"), null);
  savePendingPropertyContact("property-one");
  for (const target of ["/dashboard", "/properties/property-two", "https://evil.invalid", "//evil.invalid", "/properties/property-one?extra=1"]) {
    assert.equal(pendingPropertyContactRedirect(`?redirect=${encodeURIComponent(target)}`), null);
  }
  assert.equal(pendingPropertyContactRedirect(""), null);
});

test("expired, future, corrupt and unconsented intents cannot auto-submit", () => {
  savePendingPropertyContact("property-one");
  const valid = JSON.parse(values.get(key)!);
  for (const invalid of [
    {...valid, createdAt: Date.now() - 16 * 60 * 1000},
    {...valid, createdAt: Date.now() + 10000},
    {...valid, consentConfirmed: false}, {...valid, propertyId: "../admin"},
    {...valid, action: "unknown"}, {...valid, userId: 123},
  ]) {
    values.set(key, JSON.stringify(invalid));
    assert.equal(readPendingPropertyContact(), null);
  }
  values.set(key, "{invalid");
  assert.equal(readPendingPropertyContact(), null);
});

test("resumption is single-use and profile continuation can bind the account", () => {
  savePendingPropertyContact("property-one", "customer-one");
  assert.equal(readPendingPropertyContact()?.userId, "customer-one");
  clearPendingPropertyContact();
  assert.equal(readPendingPropertyContact(), null);
  assert.equal(pendingPropertyContactRedirect("?redirect=/properties/property-one"), null);
});
