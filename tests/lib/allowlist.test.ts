import { describe, expect, it } from 'vitest';
import { parseAllowedEmails, isAllowed } from '@/lib/auth/allowlist';

describe('parseAllowedEmails', () => {
  it('parses comma-separated emails lowercased', () => {
    const s = parseAllowedEmails('A@example.com, b@EXAMPLE.com');
    expect(s.has('a@example.com')).toBe(true);
    expect(s.has('b@example.com')).toBe(true);
  });
  it('returns empty set when undefined', () => {
    expect(parseAllowedEmails(undefined).size).toBe(0);
  });
});

describe('isAllowed', () => {
  it('is case-insensitive', () => {
    const s = parseAllowedEmails('foo@bar.com');
    expect(isAllowed(s, 'FOO@bar.com')).toBe(true);
    expect(isAllowed(s, 'other@bar.com')).toBe(false);
  });
});
