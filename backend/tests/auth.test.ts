import { describe, it, expect } from 'vitest';
import bcrypt from 'bcrypt';
import { generateToken, verifyToken } from '../src/utils/jwt.js';

describe('Authentication & JWT Utilities', () => {
  it('should generate a valid JWT token and decode it correctly', () => {
    const payload = {
      userId: 'test-user-id-123',
      email: 'agent@callcenter.io',
      role: 'AGENT',
      name: 'Agent Test',
    };

    const token = generateToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.role).toBe(payload.role);
  });

  it('should hash and compare passwords accurately', async () => {
    const rawPassword = 'SecurePassword2026!';
    const hash = await bcrypt.hash(rawPassword, 10);

    expect(hash).not.toBe(rawPassword);

    const isMatch = await bcrypt.compare(rawPassword, hash);
    expect(isMatch).toBe(true);

    const wrongMatch = await bcrypt.compare('WrongPassword', hash);
    expect(wrongMatch).toBe(false);
  });
});
