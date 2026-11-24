type SearchableUser = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
}

export function matchesAdminUser(user: SearchableUser, search: string): boolean {
  const term = search.trim().toLowerCase().replace(/\s+/g, " ");
  if (!term) return true;
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim().toLowerCase().replace(/\s+/g, " ");
  if (name.includes(term) || user.email?.toLowerCase().includes(term)) return true;
  if (!/^[+\d ()-]+$/.test(term)) return false;
  const digits = phoneDigits(term);
  return Boolean(digits && phoneDigits(user.phone ?? "").includes(digits));
}
