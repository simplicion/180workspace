/**
 * Sends push notifications to a user's registered native devices (FCM). Recipients come only from the device
 * registry of that company + user (desktop-device.ts), so a push can never reach another tenant's devices.
 * Never throws into business logic callers that use `notifyUserSafe`; `sendToUser` throws PushNotConfiguredError.
 */
import { listDevices, setDevicePushToken } from '../../api/v1/desktop/desktop-device';
import { getMessagingClient, PushNotConfiguredError } from './fcm-client';

export type PushKind = 'publish_succeeded' | 'publish_failed' | 'approval_requested' | 'reconnect_needed' | 'test';

export interface PushPayload {
  kind: PushKind;
  title: string;
  body: string;
  postId?: string;
  projectId?: string;
  /** In-app deep link, e.g. workspace180://posts/<id>. The mobile app routes it on tap. */
  link?: string;
}

export interface PushResult {
  sent: number;
  failed: number;
  /** Tokens FCM reported as dead; they are detached from their device so they are not retried. */
  removed: number;
  skipped?: 'no_devices';
}

const DEAD_TOKEN_CODES = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token', 'messaging/invalid-argument']);

export const postDeepLink = (postId: string) => `workspace180://posts/${encodeURIComponent(postId)}`;

export async function sendToUser(companyId: string, userId: string, payload: PushPayload): Promise<PushResult> {
  const messaging = getMessagingClient(); // throws PUSH_NOT_CONFIGURED before touching the registry
  const devices = (await listDevices(companyId, userId)).filter((d) => d.push?.provider === 'fcm' && d.push.token);
  if (!devices.length) return { sent: 0, failed: 0, removed: 0, skipped: 'no_devices' };

  const data: Record<string, string> = { kind: payload.kind };
  if (payload.postId) data.postId = payload.postId;
  if (payload.projectId) data.projectId = payload.projectId;
  if (payload.link) data.link = payload.link;

  const tokens = devices.map((d) => d.push!.token);
  const res = await messaging.sendEachForMulticast({
    tokens,
    notification: { title: payload.title.slice(0, 120), body: payload.body.slice(0, 400) },
    data,
    android: { priority: 'high', notification: { channelId: 'publishing', tag: payload.postId ? `post-${payload.postId}` : undefined } },
  });

  let removed = 0;
  for (let i = 0; i < res.responses.length; i++) {
    const r = res.responses[i];
    if (!r.success && r.error?.code && DEAD_TOKEN_CODES.has(r.error.code)) {
      await setDevicePushToken({ companyId, userId, deviceId: devices[i].deviceId, token: null }).catch(() => null);
      removed++;
    }
  }
  return { sent: res.successCount, failed: res.failureCount, removed };
}

/** Fire-and-forget variant for hooks: logs and swallows every error (missing config is logged once). */
let warnedNotConfigured = false;
export async function notifyUserSafe(companyId: string | null | undefined, userId: string | null | undefined, payload: PushPayload): Promise<PushResult | null> {
  if (!companyId || !userId) return null;
  try {
    return await sendToUser(companyId, userId, payload);
  } catch (err: any) {
    if (err instanceof PushNotConfiguredError) {
      if (!warnedNotConfigured) console.warn(`[Push] ${err.message} Notifications are in-app only.`);
      warnedNotConfigured = true;
    } else {
      console.error('[Push] send failed:', err?.message || err);
    }
    return null;
  }
}
