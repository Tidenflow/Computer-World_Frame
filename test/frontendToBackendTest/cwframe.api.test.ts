import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchDefaultMap,
  getCurrentUserId,
  getCurrentUsername,
  login,
  setCurrentUserId,
  setCurrentUsername,
} from '../../frontend/src/core/cwframe.api';

vi.stubGlobal('fetch', vi.fn());

describe('cwframe.api', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockClear();
    localStorage.clear();
  });

  describe('local storage helpers', () => {
    it('stores the current user id', () => {
      setCurrentUserId(99);
      expect(localStorage.getItem('cwframe_user_id')).toBe('99');
    });

    it('returns 1 when no user id is stored', () => {
      expect(getCurrentUserId()).toBe(1);
    });

    it('reads the stored user id', () => {
      localStorage.setItem('cwframe_user_id', '123');
      expect(getCurrentUserId()).toBe(123);
    });

    it('stores the current username', () => {
      setCurrentUsername('tester');
      expect(localStorage.getItem('cwframe_username')).toBe('tester');
    });

    it('returns an empty string when no username is stored', () => {
      expect(getCurrentUsername()).toBe('');
    });

    it('reads the stored username', () => {
      localStorage.setItem('cwframe_username', 'alice');
      expect(getCurrentUsername()).toBe('alice');
    });

    it('hydrates username from token when username storage is missing', () => {
      const payload = btoa(JSON.stringify({ userId: 10, username: 'Tidenflow' }))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
      localStorage.setItem('cwframe_token', `header.${payload}.signature`);

      expect(getCurrentUsername()).toBe('Tidenflow');
      expect(localStorage.getItem('cwframe_username')).toBe('Tidenflow');
    });
  });

  describe('api requests', () => {
    it('persists both user id and username after login', async () => {
      const mockAuthData = { userId: 42, username: 'tester', token: 'fake-jwt' };

      vi.mocked(fetch).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockAuthData }),
      } as any);

      const result = await login({ username: 'tester', password: 'password123' });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('tester'),
        })
      );
      expect(localStorage.getItem('cwframe_user_id')).toBe('42');
      expect(localStorage.getItem('cwframe_username')).toBe('tester');
      expect(result.userId).toBe(42);
    });

    it('throws when the backend returns success false', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: false,
            error: { message: '地图加载失败' },
          }),
      } as any);

      await expect(fetchDefaultMap()).rejects.toThrow('地图加载失败');
    });

    it('requests the default map endpoint', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: { nodes: [] } }),
      } as any);

      await fetchDefaultMap();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/maps/default'),
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );
    });
  });
});
