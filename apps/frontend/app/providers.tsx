'use client';

import { AuthProvider } from '@/lib/auth-context';
import { SettingsProvider } from '@/lib/settings-context';
import { ModalProvider } from '@/lib/modal-context';
import { SocketProvider } from '../context/SocketContext';
import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import OfflineDownloadBanner from '@/components/shared/OfflineDownloadBanner';
import ServiceWorkerRegister from '@/components/shared/ServiceWorkerRegister';
import DesktopBootstrap from '@/components/shared/DesktopBootstrap';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '../redux/store';
import { ThemeProvider } from '@/lib/theme-context';

export function Providers({ children, session }: { children: ReactNode, session?: any }) {
    return (
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <ThemeProvider>
                    <SessionProvider session={session} refetchOnWindowFocus={false} refetchInterval={0} refetchWhenOffline={false}>
                        <AuthProvider>
                            <SettingsProvider>
                                <ModalProvider>
                                    <SocketProvider>
                                        {children}
                                        <OfflineDownloadBanner />
                                        <ServiceWorkerRegister />
                                        <DesktopBootstrap />
                                    </SocketProvider>
                                </ModalProvider>
                            </SettingsProvider>
                        </AuthProvider>
                    </SessionProvider>
                </ThemeProvider>
            </PersistGate>
        </Provider>
    );
}
