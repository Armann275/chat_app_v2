import { describe, test, expect, beforeEach, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from './client';
import { useAuthStore } from '@/stores/authStore';

const mock = new MockAdapter(apiClient);
const initial = useAuthStore.getState();

beforeEach(() => {
  mock.reset();
  useAuthStore.setState(initial, true);
});

describe('apiClient request interceptor', () => {
  test('attaches Bearer token from authStore', async () => {
    useAuthStore.getState().setAuth({
      accessToken: 'tok-abc',
      user: { id: 'u1' },
    });
    let seenAuth;
    mock.onGet('/anything').reply((config) => {
      seenAuth = config.headers.Authorization;
      return [200, { ok: true }];
    });

    await apiClient.get('/anything');
    expect(seenAuth).toBe('Bearer tok-abc');
  });

  test('does not attach header when there is no token', async () => {
    let seenAuth;
    mock.onGet('/anything').reply((config) => {
      seenAuth = config.headers.Authorization;
      return [200, { ok: true }];
    });

    await apiClient.get('/anything');
    expect(seenAuth).toBeUndefined();
  });
});

describe('apiClient response interceptor (401 -> refresh -> retry)', () => {
  test('on 401, calls /auth/refresh, retries the original request with new token', async () => {
    useAuthStore.getState().setAuth({
      accessToken: 'old-token',
      user: { id: 'u1' },
    });

    let firstCall = true;
    const seenAuthHeaders = [];

    mock.onGet('/protected').reply((config) => {
      seenAuthHeaders.push(config.headers.Authorization);
      if (firstCall) {
        firstCall = false;
        return [401, { code: 'UNAUTHORIZED' }];
      }
      return [200, { success: true, data: { value: 42 } }];
    });

    mock.onPost('/auth/refresh').reply(200, {
      success: true,
      data: { user: { id: 'u1', username: 'alice' }, accessToken: 'new-token' },
    });

    const { data } = await apiClient.get('/protected');

    expect(data).toEqual({ success: true, data: { value: 42 } });
    expect(seenAuthHeaders).toEqual(['Bearer old-token', 'Bearer new-token']);
    expect(useAuthStore.getState().accessToken).toBe('new-token');
    expect(useAuthStore.getState().status).toBe('authed');
  });

  test('on refresh failure, clears auth and redirects to /login', async () => {
    useAuthStore.getState().setAuth({
      accessToken: 'old-token',
      user: { id: 'u1' },
    });

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { pathname: '/somewhere', href: '/somewhere' },
    });

    mock.onGet('/protected').reply(401, { code: 'UNAUTHORIZED' });
    mock.onPost('/auth/refresh').reply(401, { code: 'UNAUTHORIZED' });

    await expect(apiClient.get('/protected')).rejects.toBeDefined();
    expect(useAuthStore.getState().status).toBe('guest');
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  test('does not loop: a 401 from /auth/refresh is propagated, not retried', async () => {
    const refreshSpy = vi.fn().mockReturnValue([401, { code: 'UNAUTHORIZED' }]);
    mock.onPost('/auth/refresh').reply(refreshSpy);

    await expect(apiClient.post('/auth/refresh', null)).rejects.toBeDefined();
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  test('parallel 401s share a single refresh call', async () => {
    useAuthStore.getState().setAuth({
      accessToken: 'old-token',
      user: { id: 'u1' },
    });

    const calls = { a: 0, b: 0, refresh: 0 };

    mock.onGet('/a').reply((config) => {
      calls.a++;
      const isRetry = config.headers.Authorization === 'Bearer new-token';
      return isRetry ? [200, { which: 'a' }] : [401, { code: 'UNAUTHORIZED' }];
    });
    mock.onGet('/b').reply((config) => {
      calls.b++;
      const isRetry = config.headers.Authorization === 'Bearer new-token';
      return isRetry ? [200, { which: 'b' }] : [401, { code: 'UNAUTHORIZED' }];
    });
    mock.onPost('/auth/refresh').reply(() => {
      calls.refresh++;
      return [
        200,
        {
          success: true,
          data: {
            user: { id: 'u1', username: 'alice' },
            accessToken: 'new-token',
          },
        },
      ];
    });

    const [resA, resB] = await Promise.all([
      apiClient.get('/a'),
      apiClient.get('/b'),
    ]);

    expect(resA.data.which).toBe('a');
    expect(resB.data.which).toBe('b');
    expect(calls.refresh).toBe(1);
    expect(calls.a).toBe(2);
    expect(calls.b).toBe(2);
  });
});
