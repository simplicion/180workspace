'use client';

import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

interface MeetingState {
    isActive: boolean;
    isMinimized: boolean;
    roomId: string | null;
    title: string;
}

interface MeetingContextType {
    meeting: MeetingState;
    jitsiContainerRef: React.MutableRefObject<HTMLDivElement | null>;
    jitsiApiRef: React.MutableRefObject<any>;
    startMeeting: (roomId: string, title: string) => void;
    minimizeMeeting: () => void;
    maximizeMeeting: () => void;
    endMeeting: () => void;
}

const MeetingContext = createContext<MeetingContextType | null>(null);

export function MeetingProvider({ children }: { children: React.ReactNode }) {
    const [meeting, setMeeting] = useState<MeetingState>({
        isActive: false,
        isMinimized: false,
        roomId: null,
        title: '',
    });

    // This ref holds the persistent Jitsi iframe container div
    // It's created once and moved between fullscreen and PiP containers
    const jitsiContainerRef = useRef<HTMLDivElement | null>(null);
    const jitsiApiRef = useRef<any>(null);

    // Create the persistent container div on mount
    useEffect(() => {
        if (!jitsiContainerRef.current) {
            const div = document.createElement('div');
            div.style.width = '100%';
            div.style.height = '100%';
            div.style.position = 'absolute';
            div.style.inset = '0';
            jitsiContainerRef.current = div;
        }
    }, []);

    const startMeeting = useCallback((roomId: string, title: string) => {
        setMeeting({ isActive: true, isMinimized: false, roomId, title });
    }, []);

    const minimizeMeeting = useCallback(() => {
        setMeeting(prev => ({ ...prev, isMinimized: true }));
    }, []);

    const maximizeMeeting = useCallback(() => {
        setMeeting(prev => ({ ...prev, isMinimized: false }));
    }, []);

    const endMeeting = useCallback(() => {
        if (jitsiApiRef.current) {
            try { jitsiApiRef.current.dispose(); } catch (e) { }
            jitsiApiRef.current = null;
        }
        // Remove the old container and create a fresh one for next meeting
        if (jitsiContainerRef.current) {
            jitsiContainerRef.current.remove();
            const div = document.createElement('div');
            div.style.width = '100%';
            div.style.height = '100%';
            div.style.position = 'absolute';
            div.style.inset = '0';
            jitsiContainerRef.current = div;
        }
        setMeeting({ isActive: false, isMinimized: false, roomId: null, title: '' });
    }, []);

    return (
        <MeetingContext.Provider value={{ meeting, jitsiContainerRef, jitsiApiRef, startMeeting, minimizeMeeting, maximizeMeeting, endMeeting }}>
            {children}
        </MeetingContext.Provider>
    );
}

export function useMeeting() {
    const ctx = useContext(MeetingContext);
    if (!ctx) throw new Error('useMeeting must be used within MeetingProvider');
    return ctx;
}
