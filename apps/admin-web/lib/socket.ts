import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket() {
    if (typeof window === 'undefined') return null;

    if (!socket) {
        const token = localStorage.getItem('platform_auth_token');
        const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
        
        // Sanitize token: ensure it's not null, undefined, or a string literal "null"/"undefined"
        const isValidToken = token && token !== 'null' && token !== 'undefined' && token.length > 10;

        if (!isValidToken) {
            if (process.env.NODE_ENV === 'development') {
                console.log('[Socket] No valid auth token found, skipping connection');
            }
            return null;
        }

        socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => console.log('[Socket] Connected:', socket?.id));
        socket.on('disconnect', (reason: string) => console.log('[Socket] Disconnected:', reason));
        socket.on('connect_error', (err: any) => {
            // If it's an auth error, we might want to handle it specifically
            if (err.message === 'Session expired' || err.message === 'Invalid token') {
                console.error('[Socket] Auth Error:', err.message);
                // The api.tsx or auth-context.tsx should handle refreshing/logging out
            } else {
                console.error('[Socket] Connection Error:', err.message);
            }
        });
    }
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

export function updateSocketAuth(token: string | null) {
    if (socket) {
        console.log('[Socket] Updating auth token:', token ? 'Token present' : 'Token cleared');
        socket.auth = { token };
        
        // Always force a reconnection to ensure the new token is used in the handshake
        if (socket.connected) {
            console.log('[Socket] Forcing reconnection with new token');
            socket.disconnect().connect();
        } else {
            console.log('[Socket] Connecting with new token');
            socket.connect();
        }
    } else if (token) {
        // If socket wasn't initialized yet but we have a token, initialize it
        getSocket();
    }
}
