'use client';

import { LogoLoader } from "@workspace/ui";
import { useState, useRef, useEffect } from 'react';
import { Mic, Square, UploadCloud, Trash2, Play, Pause } from 'lucide-react';
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

    const [playbackTime, setPlaybackTime] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const startRecording = async () => {
        if (isRecording) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const mimeType = mediaRecorder.mimeType || 'audio/webm';
                const blob = new Blob(chunksRef.current, { type: mimeType });
                setAudioBlob(blob);
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.start(500); // chunk every 500ms
            setIsRecording(true);
            setRecordingTime(0);

            if (timerRef.current) clearInterval(timerRef.current);
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
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const discardRecording = () => {
        if (isRecording) stopRecording();
        setAudioBlob(null);
        setUploadedUrl(null);
        setRecordingTime(0);
        setPlaybackTime(0);
        setIsPlaying(false);
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.src = "";
            audioPlayerRef.current = null;
        }
        onUploadComplete('');
    };

    const uploadRecording = async () => {
        if (!audioBlob) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', audioBlob, `voice-note-${Date.now()}.${audioBlob.type.includes('mp4') ? 'mp4' : 'webm'}`);
            
            const { data } = await api.post('/api/files/upload-voice', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setUploadedUrl(data.url);
            onUploadComplete(data.url);
            toast.success('Voice note uploaded!');
        } catch (err: any) {
            console.error('Failed to upload voice note:', err);
            toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Failed to upload voice note.');
        } finally {
            setIsUploading(false);
        }
    };

    const togglePlay = () => {
        if (!audioBlob) return;
        
        if (!audioPlayerRef.current) {
            const audio = new Audio(URL.createObjectURL(audioBlob));
            audioPlayerRef.current = audio;
            
            audio.ontimeupdate = () => {
                setPlaybackTime(audio.currentTime);
            };
            
            audio.onended = () => {
                setIsPlaying(false);
                setPlaybackTime(0);
            };
        }
        
        const audio = audioPlayerRef.current;
        
        if (isPlaying) {
            audio.pause();
            setIsPlaying(false);
        } else {
            audio.play().catch(err => {
                console.error("Audio playback failed:", err);
                toast.error("Could not play the recorded audio.");
                setIsPlaying(false);
            });
            setIsPlaying(true);
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current?.state === "recording") {
                mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            }
            if (audioPlayerRef.current) {
                audioPlayerRef.current.pause();
                audioPlayerRef.current.src = "";
            }
        };
    }, []);

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
        // Calculate progress percentage, avoiding division by zero
        const progressPercentage = recordingTime > 0 
            ? Math.min((playbackTime / recordingTime) * 100, 100) 
            : 0;

        return (
            <div className="flex flex-col gap-3 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-full py-1.5 px-3">
                    <button type="button" onClick={togglePlay} className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shrink-0">
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="flex-1 h-1.5 bg-indigo-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full transition-all duration-100" style={{ width: `${progressPercentage}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-indigo-700 w-12 text-right shrink-0">
                        {formatTime(isPlaying ? playbackTime : recordingTime)}
                    </span>
                    <button type="button" onClick={discardRecording} className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
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

                    <div className="flex-1 flex justify-end">
                        <button type="button" onClick={stopRecording} className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-colors text-xs font-bold gap-1.5 shadow-sm">
                            <Square className="w-3.5 h-3.5 fill-current" /> Stop Recording
                        </button>
                    </div>
                </div>

                {!isRecording && (
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                        Click mic to start recording
                    </div>
                )}

                {!isRecording && (
                    <button
                        type="button"
                        onClick={startRecording}
                        className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0",
                            "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        )}
                        title="Click to start recording"
                    >
                        <Mic className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
}
