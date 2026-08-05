import { describe, expect, it } from 'vitest';
import { timingSafeEqual } from 'crypto';

function validateWebhookToken(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

describe('webhook token validation', () => {
  it('accepts valid token', () => {
    expect(validateWebhookToken('secret-token', 'secret-token')).toBe(true);
  });
  it('rejects invalid token', () => {
    expect(validateWebhookToken('wrong', 'secret-token')).toBe(false);
  });
});
