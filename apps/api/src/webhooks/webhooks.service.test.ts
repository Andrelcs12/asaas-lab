import { describe, expect, it } from 'vitest';
import { timingSafeEqual } from 'crypto';

function validateWebhookToken(received: string | undefined, expected: string): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

describe('validateWebhookToken', () => {
  it('accepts valid token', () => {
    expect(validateWebhookToken('secret-token', 'secret-token')).toBe(true);
  });

  it('rejects invalid token', () => {
    expect(validateWebhookToken('wrong', 'secret-token')).toBe(false);
  });

  it('rejects missing token', () => {
    expect(validateWebhookToken(undefined, 'secret-token')).toBe(false);
  });
});
