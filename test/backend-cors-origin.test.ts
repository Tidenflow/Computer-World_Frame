import { describe, expect, it } from 'vitest';
import { isAllowedCorsOrigin } from '../backend/src/config/cors';

describe('isAllowedCorsOrigin', () => {
  it('allows local frontend origins during development-friendly runs', () => {
    expect(isAllowedCorsOrigin('http://localhost:5173', ['https://cw.tidenflow.life'])).toBe(true);
    expect(isAllowedCorsOrigin('http://127.0.0.1:4173', ['https://cw.tidenflow.life'])).toBe(true);
  });

  it('still honors explicit production whitelist entries', () => {
    expect(
      isAllowedCorsOrigin('https://computer-world-frame.vercel.app', ['https://computer-world-frame.vercel.app'])
    ).toBe(true);
  });

  it('rejects unknown non-local origins', () => {
    expect(isAllowedCorsOrigin('https://evil.example.com', ['https://cw.tidenflow.life'])).toBe(false);
  });
});
