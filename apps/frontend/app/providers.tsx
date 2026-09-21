'use client';

import { AuthProvider } from '@/lib/auth-context';
import { SettingsProvider } from '@/lib/settings-context';
import { ModalProvider } from '@/lib/modal-context';
import { SocketProvider } from '../context/SocketContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import OfflineDownloadBanner from '@/components/shared/OfflineDownloadBanner';
import ServiceWorkerRegister from '@/components/shared/ServiceWorkerRegister';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../redux/store';

export function Providers({ children, session }: { children: ReactNode, session?: any }) {
    // Safely get the client id, handle cases where it might not be defined during build
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'dummy-client-id-for-build';

    return (
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <SessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0} refetchWhenOffline={false}>
                    <GoogleOAuthProvider clientId={clientId}>
                        <AuthProvider>
                            <SettingsProvider>
                                <ModalProvider>
                                    <SocketProvider>
                                        {children}
                                        <OfflineDownloadBanner />
                                        <ServiceWorkerRegister />
                                    </SocketProvider>
                                </ModalProvider>
                            </SettingsProvider>
                        </AuthProvider>
                    </GoogleOAuthProvider>
                </SessionProvider>
            </PersistGate>
        </Provider>
    );
}
