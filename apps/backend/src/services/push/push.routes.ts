import { Router, Request, Response } from 'express';
import { pushStatus, PushNotConfiguredError } from './fcm-client';
import { sendToUser } from './push.service';

/**
 * Push notification status + self-test. Mounted behind `protect` at /desktop/push (see desktop.routes.ts).
 * Token registration is per device and lives at PUT /desktop/devices/:deviceId/push-token (company + user scoped).
 *
 *   GET  /desktop/push/status  -> { configured, provider, missingEnv }   (never returns credentials)
 *   POST /desktop/push/test    -> sends a test notification to the caller's own devices; 503 PUSH_NOT_CONFIGURED
 */
const router: Router = Router();

router.get('/status', (req: Request, res: Response) => {
  const s = pushStatus();
  return res.json({ success: true, configured: s.configured, provider: s.provider, missingEnv: s.missingEnv });
});

router.post('/test', async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user?.id || !user?.companyId) return res.status(401).json({ success: false, error: 'Authentication required' });
  try {
    const result = await sendToUser(String(user.companyId), String(user.id), { kind: 'test', title: '180 Social', body: 'Push notifications are working on this device.' });
    if (result.skipped === 'no_devices') return res.status(404).json({ success: false, error: 'NO_PUSH_DEVICES', message: 'No device with notifications enabled is registered for your account.' });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    if (err instanceof PushNotConfiguredError) return res.status(503).json({ success: false, error: err.code, message: err.message, missingEnv: err.missingEnv });
    console.error('[Push] test send failed:', err?.message || err);
    return res.status(502).json({ success: false, error: 'PUSH_SEND_FAILED', message: 'The push provider rejected the request. Try again shortly.' });
  }
});

export default router;
