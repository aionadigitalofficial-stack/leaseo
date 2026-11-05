// Short-lived, tab-local intent only. Never store phone numbers or credentials.
const KEY = "leaseo.pending-property-contact";
const MAX_AGE = 15 * 60 * 1000;

export type PendingPropertyContact = {
  propertyId: string;
  action: "whatsapp";
  consentConfirmed: true;
  createdAt: number;
  userId: string | null;
};

export function savePendingPropertyContact(propertyId: string, userId: string | null = null) {
  const intent: PendingPropertyContact = {
    propertyId, action: "whatsapp", consentConfirmed: true, createdAt: Date.now(), userId,
  };
  // Let callers show an error rather than losing consent silently if storage is blocked.
  sessionStorage.setItem(KEY, JSON.stringify(intent));
}

export function clearPendingPropertyContact() {
  sessionStorage.removeItem(KEY);
}

export function readPendingPropertyContact(): PendingPropertyContact | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (!value) return null;
    if (typeof value.propertyId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value.propertyId) ||
        value.action !== "whatsapp" || value.consentConfirmed !== true ||
        typeof value.createdAt !== "number" || !Number.isFinite(value.createdAt) ||
        value.createdAt > Date.now() || Date.now() - value.createdAt > MAX_AGE ||
        !(value.userId === null || typeof value.userId === "string")) {
      clearPendingPropertyContact();
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

// Only resume the exact property which the user explicitly consented to contact.
// This is not a general redirect helper: external URLs and unrelated pages are ignored.
export function pendingPropertyContactRedirect(search: string): string | null {
  const intent = readPendingPropertyContact();
  if (!intent) return null;
  const target = new URLSearchParams(search).get("redirect");
  const expected = `/properties/${encodeURIComponent(intent.propertyId)}`;
  return target === expected ? expected : null;
}
