'use client';

import { AuthProvider } from '../lib/auth-context';
import { SettingsProvider } from '../lib/settings-context';
import { ModalProvider } from '../lib/modal-context';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
    // Safely get the client id, handle cases where it might not be defined during build
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'dummy-client-id-for-build';

    return (
        <GoogleOAuthProvider clientId={clientId}>
            <AuthProvider>
                <SettingsProvider>
                    <ModalProvider>
                        {children}
                    </ModalProvider>
                </SettingsProvider>
            </AuthProvider>
        </GoogleOAuthProvider>
    );
}
