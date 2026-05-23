import { describe, test, expect } from 'vitest';
import { loginSchema } from './LoginForm';
import { registerSchema } from './RegisterForm';

describe('loginSchema', () => {
  test('accepts a valid email + password', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.com', password: 'whatever' }).success,
    ).toBe(true);
  });

  test('rejects empty email', () => {
    const res = loginSchema.safeParse({ email: '', password: 'x' });
    expect(res.success).toBe(false);
    expect(res.error.issues.find((i) => i.path[0] === 'email')).toBeDefined();
  });

  test('rejects malformed email', () => {
    const res = loginSchema.safeParse({ email: 'nope', password: 'x' });
    expect(res.success).toBe(false);
  });

  test('rejects empty password', () => {
    const res = loginSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(res.success).toBe(false);
    expect(res.error.issues.find((i) => i.path[0] === 'password')).toBeDefined();
  });
});

describe('registerSchema', () => {
  const valid = {
    username: 'alice_1',
    email: 'alice@example.com',
    password: 'longenough1',
  };

  test('accepts a valid payload', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  test('rejects username under 3 chars', () => {
    const res = registerSchema.safeParse({ ...valid, username: 'al' });
    expect(res.success).toBe(false);
  });

  test('rejects username over 32 chars', () => {
    const res = registerSchema.safeParse({ ...valid, username: 'a'.repeat(33) });
    expect(res.success).toBe(false);
  });

  test('rejects username with disallowed chars', () => {
    const res = registerSchema.safeParse({ ...valid, username: 'al ice' });
    expect(res.success).toBe(false);
  });

  test('accepts username with letters/digits/underscore', () => {
    expect(
      registerSchema.safeParse({ ...valid, username: 'A_b_2' }).success,
    ).toBe(true);
  });

  test('rejects password under 8 chars', () => {
    const res = registerSchema.safeParse({ ...valid, password: 'short1' });
    expect(res.success).toBe(false);
  });

  test('rejects password over 128 chars', () => {
    const res = registerSchema.safeParse({ ...valid, password: 'x'.repeat(129) });
    expect(res.success).toBe(false);
  });
});
