/**
 * Firebase Cloud Messaging client, built only from env (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
 * FIREBASE_PRIVATE_KEY). There is no fallback credential: with any of them missing every send fails with the typed
 * PUSH_NOT_CONFIGURED error and `pushStatus()` reports which variables are missing.
 * Tests inject a fake messaging client with `setMessagingClientForTest`.
 */
export interface MulticastMessage {
  tokens: string[];
  notification: { title: string; body: string };
  data: Record<string, string>;
  android?: Record<string, any>;
  apns?: Record<string, any>;
}

export interface SendResponse {
  success: boolean;
  error?: { code?: string; message?: string };
}

export interface MessagingClient {
  sendEachForMulticast(message: MulticastMessage): Promise<{ successCount: number; failureCount: number; responses: SendResponse[] }>;
}

export class PushNotConfiguredError extends Error {
  readonly code = 'PUSH_NOT_CONFIGURED';
  constructor(readonly missingEnv: string[]) {
    super(`Push notifications are not configured on this server (missing ${missingEnv.join(', ')}).`);
    this.name = 'PushNotConfiguredError';
  }
}

const REQUIRED = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'] as const;

export function missingFirebaseEnv(): string[] {
  return REQUIRED.filter((k) => !process.env[k]?.trim());
}

export function pushStatus(): { configured: boolean; provider: 'fcm'; projectId: string | null; missingEnv: string[] } {
  const missing = testClient ? [] : missingFirebaseEnv();
  return { configured: missing.length === 0, provider: 'fcm', projectId: process.env.FIREBASE_PROJECT_ID?.trim() || null, missingEnv: missing };
}

let testClient: MessagingClient | null = null;
let liveClient: MessagingClient | null = null;

/** Test hook: inject a fake messaging client (pass null to restore). */
export function setMessagingClientForTest(client: MessagingClient | null) {
  testClient = client;
}

/** Returns the FCM client or throws PushNotConfiguredError. firebase-admin is loaded lazily (only when configured). */
export function getMessagingClient(): MessagingClient {
  if (testClient) return testClient;
  if (liveClient) return liveClient;
  const missing = missingFirebaseEnv();
  if (missing.length) throw new PushNotConfiguredError(missing);

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const appMod = require('firebase-admin/app');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const msgMod = require('firebase-admin/messaging');
  const name = 'social-push';
  const existing = appMod.getApps().find((a: any) => a.name === name);
  const app =
    existing ||
    appMod.initializeApp(
      {
        credential: appMod.cert({
          projectId: process.env.FIREBASE_PROJECT_ID!.trim(),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!.trim(),
          // Env files usually carry the PEM with literal "\n" sequences.
          privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID!.trim(),
      },
      name
    );
  liveClient = msgMod.getMessaging(app) as MessagingClient;
  return liveClient;
}
