'use client';

import { AuthProvider } from '../lib/auth-context';
import { SettingsProvider } from '../lib/settings-context';
import { ModalProvider } from '../lib/modal-context';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            <SettingsProvider>
                <ModalProvider>
                    {children}
                </ModalProvider>
            </SettingsProvider>
        </AuthProvider>
    );
}

