'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useRef, useEffect } from 'react';
import { Mic, Square, UploadCloud, Trash2, Lock, Play, Pause, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
    onUploadComplete: (url: string) => void;
    label?: string;
}

export default function VoiceRecorder({ onUploadComplete, label = 'Record Voice Note' }: Props) {
    const [isRecording, setIsRecording] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startYRef = useRef<number | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = time % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setIsLocked(false);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            toast.error('Microphone access denied or unavailable.');
            console.error(err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const discardRecording = () => {
        if (isRecording) stopRecording();
        setAudioBlob(null);
        setUploadedUrl(null);
        setRecordingTime(0);
        setIsLocked(false);
        setIsPlaying(false);
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.src = "";
        }
        onUploadComplete('');
    };

    const uploadRecording = async () => {
        if (!audioBlob) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', audioBlob, `voice-note-${Date.now()}.webm`);
            
            const { data } = await api.post('/api/files/upload-voice', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setUploadedUrl(data.url);
            onUploadComplete(data.url);
            toast.success('Voice note uploaded!');
        } catch (err) {
            console.error('Failed to upload voice note:', err);
            toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to upload voice note.');
        } finally {
            setIsUploading(false);
        }
    };

    const togglePlay = () => {
        if (audioBlob) {
            if (!audioPlayerRef.current) {
                audioPlayerRef.current = new Audio(URL.createObjectURL(audioBlob));
                audioPlayerRef.current.onended = () => setIsPlaying(false);
            }
            if (isPlaying) {
                audioPlayerRef.current.pause();
                setIsPlaying(false);
            } else {
                audioPlayerRef.current.play();
                setIsPlaying(true);
            }
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current?.state === "recording") {
                mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (audioBlob || uploadedUrl) return; 
        e.currentTarget.setPointerCapture(e.pointerId);
        startYRef.current = e.clientY;
        startRecording();
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isRecording || isLocked || !startYRef.current) return;
        if (startYRef.current - e.clientY > 40) {
            setIsLocked(true);
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        startYRef.current = null;
        if (isRecording && !isLocked) {
            stopRecording();
        }
    };

    if (uploadedUrl) {
        return (
            <div className="flex flex-col gap-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <div className="text-sm font-medium text-indigo-900 flex items-center justify-between">
                    <span>Voice Note Added</span>
                    <button type="button" onClick={discardRecording} className="text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors" title="Remove voice note">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                <audio controls src={uploadedUrl} className="w-full h-8" />
            </div>
        );
    }

    if (audioBlob) {
        return (
            <div className="flex flex-col gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-full py-1.5 px-3">
                    <button type="button" onClick={togglePlay} className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors">
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="flex-1 h-1.5 bg-indigo-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: '100%' }} />
                    </div>
                    <span className="text-xs font-semibold text-indigo-700 w-10">{formatTime(recordingTime)}</span>
                    <button type="button" onClick={discardRecording} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex items-center justify-end gap-2 mt-1">
                    <button 
                        type="button" 
                        onClick={discardRecording}
                        disabled={isUploading}
                        className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                    >
                        Discard
                    </button>
                    <button 
                        type="button" 
                        onClick={uploadRecording}
                        disabled={isUploading}
                        className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1.5 transition-colors disabled:opacity-50 font-medium shadow-sm"
                    >
                        {isUploading ? <LogoLoader className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                        Upload
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <div className="flex items-center justify-between">
                <div 
                    className={clsx(
                        "flex items-center gap-3 transition-all duration-300 ease-in-out w-full",
                        isRecording ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none absolute"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-sm font-semibold text-gray-700 min-w-[40px]">
                            {formatTime(recordingTime)}
                        </span>
                    </div>

                    {isLocked ? (
                        <div className="flex-1 flex justify-end">
                            <button type="button" onClick={stopRecording} className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center transition-colors text-xs font-bold gap-1.5 shadow-sm">
                                <CheckCircle2 className="w-4 h-4" /> Save Recording
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex justify-end pr-4">
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium animate-bounce">
                                <Lock className="w-3 h-3" /> Swipe up to lock
                            </div>
                        </div>
                    )}
                </div>

                {!isRecording && (
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                        Hold mic to record, swipe up to lock
                    </div>
                )}

                {(!isRecording || !isLocked) && (
                    <button
                        type="button"
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all touch-none select-none shrink-0",
                            isRecording && !isLocked ? "bg-red-500 text-white scale-110 shadow-xl ml-4" : 
                            "bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                        )}
                        title="Hold to record voice message"
                    >
                        <Mic className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
}
