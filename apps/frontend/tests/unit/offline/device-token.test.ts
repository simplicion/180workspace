/**
 * @jest-environment jsdom
 */
import { currentDeviceToken, ensureDeviceToken, isMediaApiUrl, loadStoredDevice } from '../../../lib/native/device-token';

const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString('base64url');
const tokenFor = (id: string) => `${b64({ alg: 'none' })}.${b64({ id, companyId: 'c1' })}.sig`;
const DAY = 24 * 60 * 60 * 1000;

function signIn(userId: string) {
  window.localStorage.setItem('platform_auth_token', tokenFor(userId));
}
beforeEach(() => {
  window.localStorage.clear();
});

describe('isMediaApiUrl', () => {
  it('matches only the server media processing routes', () => {
    for (const u of ['/api/v1/media-editor/render', '/api/v1/media-editor/ai-direct', '/api/v1/video-studio/render', '/api/media-editor/generate-from-prompt', 'https://api.x.com/api/v1/social-media/posts/sync-studio-render', '/api/v1/media-editor/render?x=1']) {
      expect(isMediaApiUrl(u)).toBe(true);
    }
    for (const u of ['/api/v1/media-editor/projects', '/api/v1/media-editor/ai-status', '/api/v1/media-editor/stock/search', '/api/tasks', '/api/v1/desktop/devices/register', '', undefined]) {
      expect(isMediaApiUrl(u as any)).toBe(false);
    }
  });
});

describe('ensureDeviceToken', () => {
  const fresh = (deviceId = 'dev-1', expiresAt = Date.now() + 30 * DAY) => ({ token: `tok-${deviceId}-${expiresAt}`, deviceId, expiresAt });

  it('does nothing without a signed-in user', async () => {
    const register = jest.fn();
    expect(await ensureDeviceToken(register, 'x', 'windows')).toBeNull();
    expect(register).not.toHaveBeenCalled();
  });

  it('registers once, stores per user, and reuses the token until it is close to expiry', async () => {
    signIn('u1');
    const register = jest.fn().mockResolvedValue(fresh());
    const t1 = await ensureDeviceToken(register, 'My PC', 'windows');
    const t2 = await ensureDeviceToken(register, 'My PC', 'windows');
    expect(t1).toBe(t2);
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith({ label: 'My PC', platform: 'windows', deviceId: undefined });
    expect(currentDeviceToken()).toBe(t1);
  });

  it('renews with the SAME deviceId before expiry (so it never uses another device slot)', async () => {
    signIn('u1');
    const now = Date.now();
    const register = jest.fn().mockResolvedValueOnce(fresh('dev-1', now + 2 * DAY)).mockResolvedValueOnce(fresh('dev-1', now + 32 * DAY));
    await ensureDeviceToken(register, 'PC', 'windows', now); // stores a token that expires in 2 days (< 3 day renewal window)
    const renewed = await ensureDeviceToken(register, 'PC', 'windows', now + 1000);
    expect(register).toHaveBeenCalledTimes(2);
    expect(register.mock.calls[1][0].deviceId).toBe('dev-1');
    expect(renewed).toContain('dev-1');
  });

  it('keeps using a still-valid token when renewal fails (offline / server down), and returns null when there is none', async () => {
    signIn('u1');
    const now = Date.now();
    await ensureDeviceToken(jest.fn().mockResolvedValue(fresh('dev-1', now + 2 * DAY)), 'PC', 'windows', now);
    const failing = jest.fn().mockRejectedValue(new Error('Network Error'));
    const stillValid = await ensureDeviceToken(failing, 'PC', 'windows', now + 1000);
    expect(stillValid).toContain('dev-1');

    signIn('u2'); // a different account: nothing stored, registration fails -> no token, and no throw
    expect(await ensureDeviceToken(failing, 'PC', 'windows')).toBeNull();
  });

  it('keeps each account\'s device separate and never sends an expired token', async () => {
    signIn('u1');
    await ensureDeviceToken(jest.fn().mockResolvedValue(fresh('dev-u1')), 'PC', 'windows');
    signIn('u2');
    expect(currentDeviceToken()).toBeNull(); // u1's token is not offered to u2
    await ensureDeviceToken(jest.fn().mockResolvedValue(fresh('dev-u2')), 'PC', 'windows');
    expect(currentDeviceToken()).toContain('dev-u2');

    signIn('u1');
    expect(currentDeviceToken()).toContain('dev-u1');
    expect(loadStoredDevice('u1', Date.now() + 100 * DAY)?.deviceId).toBe('dev-u1');
    expect(currentDeviceToken(Date.now() + 100 * DAY)).toBeNull(); // expired
  });
});
