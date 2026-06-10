export function parseAllowedEmails(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowed(allowed: Set<string>, email: string): boolean {
  return allowed.has(email.toLowerCase());
}
