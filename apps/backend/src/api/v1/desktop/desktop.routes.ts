import { Router, Request, Response } from 'express';
import { DeviceLimitError, DeviceRecord, listDevices, registerDevice, requestDeviceId, revokeDevice, setDevicePushToken } from './desktop-device';

/**
 * Desktop device management. Mounted behind `protect`, so every call is a signed-in user acting on their OWN devices
 * (the registry is keyed by company + user; there is no way to name another user's devices).
 *
 *   POST   /desktop/devices/register   { label?, platform?, deviceId? }  -> { deviceId, token, expiresAt, renewed, evicted }
 *                                      (send the stored deviceId to RENEW a token without using another device slot;
 *                                      at the limit the least-recently-seen idle device is evicted and returned in
 *                                      `evicted`; 409 DEVICE_LIMIT only when every device was active recently)
 *   GET    /desktop/devices                                   -> the caller's devices (`current: true` marks the caller's)
 *   DELETE /desktop/devices/:deviceId                         -> revoke one (its token stops working immediately)
 *   PUT    /desktop/devices/:deviceId/push-token  { provider: 'fcm'|'apns', token } | { token: null }  -> register/clear push
 */
const router: Router = Router();

function scope(req: Request) {
  const user = (req as any).user;
  if (!user?.id || !user?.companyId) return null;
  return { userId: String(user.id), companyId: String(user.companyId) };
}

/** Never echo a push token back; clients only need to know one is registered. */
const publicDevice = (d: DeviceRecord) => {
  const { push, ...rest } = d;
  return { ...rest, push: push ? { provider: push.provider, registered: true, updatedAt: push.updatedAt } : null };
};

const failure = (res: Response, err: any) => {
  if (err instanceof DeviceLimitError) return res.status(409).json({ success: false, error: 'DEVICE_LIMIT', message: err.message });
  if (/DESKTOP_DEVICE_JWT_SECRET/.test(err?.message || '')) {
    console.error('[DesktopDevice]', err.message);
    return res.status(503).json({ success: false, error: 'DESKTOP_DEVICE_UNAVAILABLE', message: 'Desktop device registration is not configured on the server.' });
  }
  console.error('[DesktopDevice] request failed:', err?.message || err);
  return res.status(503).json({ success: false, error: 'DESKTOP_DEVICE_UNAVAILABLE', message: 'Device registry is temporarily unavailable. Try again shortly.' });
};

router.post('/devices/register', async (req: Request, res: Response) => {
  const s = scope(req);
  if (!s) return res.status(401).json({ success: false, error: 'Authentication required' });
  try {
    const { label, platform, deviceId } = req.body || {};
    const device = await registerDevice({
      ...s,
      label: typeof label === 'string' ? label : undefined,
      platform: typeof platform === 'string' ? platform : undefined,
      deviceId: typeof deviceId === 'string' ? deviceId : undefined,
      // The device making the request (if it presents its token) is never evicted.
      currentDeviceId: requestDeviceId(req),
    });
    return res.status(201).json({ success: true, ...device });
  } catch (err) {
    return failure(res, err);
  }
});

router.get('/devices', async (req: Request, res: Response) => {
  const s = scope(req);
  if (!s) return res.status(401).json({ success: false, error: 'Authentication required' });
  try {
    const current = requestDeviceId(req);
    return res.json({ success: true, devices: (await listDevices(s.companyId, s.userId)).map((d) => ({ ...publicDevice(d), current: d.deviceId === current })) });
  } catch (err) {
    return failure(res, err);
  }
});

router.delete('/devices/:deviceId', async (req: Request, res: Response) => {
  const s = scope(req);
  if (!s) return res.status(401).json({ success: false, error: 'Authentication required' });
  try {
    const removed = await revokeDevice(s.companyId, s.userId, String(req.params.deviceId));
    return removed ? res.json({ success: true }) : res.status(404).json({ success: false, error: 'Device not found' });
  } catch (err) {
    return failure(res, err);
  }
});

router.put('/devices/:deviceId/push-token', async (req: Request, res: Response) => {
  const s = scope(req);
  if (!s) return res.status(401).json({ success: false, error: 'Authentication required' });
  const { provider, token } = req.body || {};
  const clearing = token === null;
  if (!clearing) {
    if (provider !== 'fcm' && provider !== 'apns') return res.status(400).json({ success: false, error: "provider must be 'fcm' or 'apns'" });
    if (typeof token !== 'string' || token.length < 16 || token.length > 4096 || /\s/.test(token)) {
      return res.status(400).json({ success: false, error: 'token must be the FCM registration token or APNs device token string' });
    }
  }
  try {
    const updated = await setDevicePushToken({ ...s, deviceId: String(req.params.deviceId), provider: clearing ? undefined : provider, token: clearing ? null : token });
    if (!updated) return res.status(404).json({ success: false, error: 'Device not found' });
    return res.json({ success: true, device: publicDevice(updated) });
  } catch (err) {
    return failure(res, err);
  }
});

export default router;
