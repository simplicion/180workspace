'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Play, Pause, Check } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface Props {
    onChangeBlobs: (blobs: Blob[]) => void;
    label?: string;
}

function VoiceNoteItem({ blob, index, onRemove }: { blob: Blob, index: number, onRemove: () => void }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = new Audio(URL.createObjectURL(blob));
        audioPlayerRef.current = audio;

        audio.onloadedmetadata = () => {
            if (audio.duration !== Infinity && !isNaN(audio.duration)) {
                setDuration(audio.duration);
            }
        };

        audio.ontimeupdate = () => {
            setPlaybackTime(audio.currentTime);
            // Fallback for duration if loadedmetadata fails
            if (audio.duration !== Infinity && !isNaN(audio.duration) && duration === 0) {
                setDuration(audio.duration);
            }
        };

        audio.onended = () => {
            setIsPlaying(false);
            setPlaybackTime(0);
        };

        return () => {
            audio.pause();
            audio.src = "";
        };
    }, [blob]);

    const togglePlay = () => {
        const audio = audioPlayerRef.current;
        if (!audio) return;

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

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const progressPercentage = duration > 0 ? Math.min((playbackTime / duration) * 100, 100) : 0;

    return (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-full py-1.5 px-3 mb-2 w-full">
            <button type="button" onClick={togglePlay} className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shrink-0">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="flex-1 h-1.5 bg-indigo-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full transition-all duration-100" style={{ width: `${progressPercentage}%` }} />
            </div>
            <span className="text-xs font-semibold text-indigo-700 w-12 text-right shrink-0">
                {formatTime(isPlaying ? playbackTime : duration)}
            </span>
            <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}

export default function MultiVoiceRecorder({ onChangeBlobs, label = 'Record Voice Notes' }: Props) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [blobs, setBlobs] = useState<Blob[]>([]);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const startRecording = async () => {
        if (isRecording) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const mimeType = mediaRecorder.mimeType || 'audio/webm';
                const blob = new Blob(chunksRef.current, { type: mimeType });
                
                setBlobs(prev => {
                    const newBlobs = [...prev, blob];
                    onChangeBlobs(newBlobs);
                    return newBlobs;
                });
                
                stopStream();
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
        } else {
            // Failsafe stream stop
            stopStream();
        }
    };

    const removeBlob = (index: number) => {
        setBlobs(prev => {
            const newBlobs = [...prev];
            newBlobs.splice(index, 1);
            onChangeBlobs(newBlobs);
            return newBlobs;
        });
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            stopStream();
        };
    }, []);

    return (
        <div className="flex flex-col gap-2 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            
            {blobs.length > 0 && (
                <div className="flex flex-col w-full">
                    {blobs.map((blob, index) => (
                        <VoiceNoteItem key={index} blob={blob} index={index} onRemove={() => removeBlob(index)} />
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between mt-1">
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
                        <button type="button" onClick={stopRecording} className="w-10 h-10 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-colors shadow-sm" title="Stop and save recording">
                            <Check className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {!isRecording && (
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                        {blobs.length > 0 ? "Click mic to record another" : "Click mic to start recording"}
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
