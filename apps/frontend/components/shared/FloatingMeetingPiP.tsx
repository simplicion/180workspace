'use client';

import { useEffect, useRef, useState } from 'react';
import { useMeeting } from '@/lib/meeting-context';
import { Maximize2, PhoneOff } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingMeetingPiP() {
    const { meeting, jitsiContainerRef, minimizeMeeting, maximizeMeeting, endMeeting } = useMeeting();
    const router = useRouter();
    const pathname = usePathname();
    const pipSlotRef = useRef<HTMLDivElement>(null);

    // Dragging state
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        dragStart.current = {
            x: e.clientX,
            y: e.clientY,
            startX: position.x,
            startY: position.y
        };
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - dragStart.current.x;
            const dy = e.clientY - dragStart.current.y;
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 340, dragStart.current.startX + dx)),
                y: Math.max(0, Math.min(window.innerHeight - 220, dragStart.current.startY - dy))
            });
        };

        const handleMouseUp = () => setIsDragging(false);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Attach Jitsi container to PiP slot when minimized
    useEffect(() => {
        if (meeting.isActive && meeting.isMinimized && jitsiContainerRef.current && pipSlotRef.current) {
            if (jitsiContainerRef.current.parentNode !== pipSlotRef.current) {
                pipSlotRef.current.appendChild(jitsiContainerRef.current);
            }
        }
    }, [meeting.isActive, meeting.isMinimized]);

    // Auto-minimize when navigating away from the meeting page (e.g. Back button)
    useEffect(() => {
        if (meeting.isActive && !meeting.isMinimized) {
            if (!pathname.startsWith(`/dashboard/meeting/${meeting.roomId}`)) {
                minimizeMeeting();
            }
        }
    }, [pathname, meeting.isActive, meeting.isMinimized, meeting.roomId, minimizeMeeting]);

    const handleMaximize = () => {
        maximizeMeeting();
        if (meeting.roomId) {
            router.push(`/dashboard/meeting/${meeting.roomId}`);
        }
    };

    const handleEnd = () => {
        endMeeting();
    };

    if (!meeting.isActive || !meeting.isMinimized) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ scale: 0.3, opacity: 0, y: 100 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.3, opacity: 0, y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed z-[9999] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10 ring-1 ring-black/20"
                style={{
                    right: position.x,
                    bottom: position.y,
                    width: 320,
                    height: 200,
                }}
            >
                {/* Drag Handle + Controls */}
                <div
                    onMouseDown={handleMouseDown}
                    className={clsx(
                        "absolute top-0 left-0 right-0 z-10 h-10 flex items-center justify-between px-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent cursor-grab",
                        isDragging && "cursor-grabbing"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
                        <span className="text-white text-[11px] font-semibold truncate max-w-[140px] drop-shadow-sm">
                            {meeting.title || 'Meeting'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleMaximize}
                            className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                            title="Back to full screen"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={handleEnd}
                            className="p-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-white transition-colors shadow-sm"
                            title="End meeting"
                        >
                            <PhoneOff className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Jitsi Slot - the persistent container gets appended here */}
                <div ref={pipSlotRef} className="w-full h-full bg-slate-900 overflow-hidden" />

                {/* Bottom gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            </motion.div>
        </AnimatePresence>
    );
}
