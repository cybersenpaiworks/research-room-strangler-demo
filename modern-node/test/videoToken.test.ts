import { describe, expect, it } from 'vitest';

import { generateVideoToken } from '../src/lib/videoToken';

describe('generateVideoToken', () => {
  it('creates a deterministic token payload shape', () => {
    const issuedAt = new Date('2026-04-01T12:00:00.000Z');
    const token = generateVideoToken({
      sessionId: 7,
      role: 'moderator',
      userId: 'ana@example.com',
      secret: 'unit-test-secret',
      ttlSeconds: 300,
      issuedAt,
    });

    expect(token.provider).toBe('mock-video-cloud');
    expect(token.roomName).toBe('session-7');
    expect(token.role).toBe('moderator');
    expect(token.userId).toBe('ana@example.com');
    expect(token.issuedAt).toBe('2026-04-01T12:00:00.000Z');
    expect(token.expiresAt).toBe('2026-04-01T12:05:00.000Z');
    expect(token.token.length).toBeGreaterThan(32);
  });
});
