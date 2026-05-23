import { describe, test, expect, beforeEach } from 'vitest';
import { useAuthStore, getAccessToken } from './authStore';

const initial = useAuthStore.getState();

beforeEach(() => {
  useAuthStore.setState(initial, true);
});

describe('authStore', () => {
  test('starts in loading state', () => {
    const s = useAuthStore.getState();
    expect(s.status).toBe('loading');
    expect(s.accessToken).toBeNull();
    expect(s.user).toBeNull();
  });

  test('setAuth transitions to authed and stores token + user', () => {
    useAuthStore.getState().setAuth({
      accessToken: 'tok-1',
      user: { id: 'u1', username: 'alice' },
    });
    const s = useAuthStore.getState();
    expect(s.status).toBe('authed');
    expect(s.accessToken).toBe('tok-1');
    expect(s.user).toEqual({ id: 'u1', username: 'alice' });
  });

  test('setGuest clears token + user', () => {
    useAuthStore.getState().setAuth({ accessToken: 't', user: { id: 'u' } });
    useAuthStore.getState().setGuest();
    const s = useAuthStore.getState();
    expect(s.status).toBe('guest');
    expect(s.accessToken).toBeNull();
    expect(s.user).toBeNull();
  });

  test('clearAuth behaves like setGuest', () => {
    useAuthStore.getState().setAuth({ accessToken: 't', user: { id: 'u' } });
    useAuthStore.getState().clearAuth();
    const s = useAuthStore.getState();
    expect(s.status).toBe('guest');
    expect(s.accessToken).toBeNull();
    expect(s.user).toBeNull();
  });

  test('setUser updates user without touching token/status', () => {
    useAuthStore.getState().setAuth({
      accessToken: 'tok-1',
      user: { id: 'u1', username: 'alice' },
    });
    useAuthStore.getState().setUser({ id: 'u1', username: 'alice', bio: 'hi' });
    const s = useAuthStore.getState();
    expect(s.status).toBe('authed');
    expect(s.accessToken).toBe('tok-1');
    expect(s.user.bio).toBe('hi');
  });

  test('getAccessToken reads from current state', () => {
    expect(getAccessToken()).toBeNull();
    useAuthStore.getState().setAuth({ accessToken: 'tok-2', user: { id: 'u' } });
    expect(getAccessToken()).toBe('tok-2');
  });
});
