'use client';

import { useEffect } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { hasNativeMedia } from '@/lib/native/desktop-media';
import { ensureDeviceToken } from '@/lib/native/device-token';
import { detectOS } from '@/lib/platform/desktop';

/**
 * Desktop app only: once the user is signed in, register this computer as a device (or renew its token) so the server
 * media routes accept it. Renders nothing and does nothing in a browser.
 */
export default function DesktopBootstrap() {
  const { token } = useAuth();

  useEffect(() => {
    if (!token || !hasNativeMedia()) return;
    void ensureDeviceToken(
      async (body) => {
        const { data } = await api.post('/api/v1/desktop/devices/register', body, { __skipOffline: true } as any);
        return { token: data.token, deviceId: data.deviceId, expiresAt: data.expiresAt };
      },
      `${detectOS()} desktop app`,
      detectOS()
    );
  }, [token]);

  return null;
}
