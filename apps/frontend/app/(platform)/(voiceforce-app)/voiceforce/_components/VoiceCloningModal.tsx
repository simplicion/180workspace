"use client";

import { useState, useRef } from 'react';
import { 
  X, Mic, Upload, Play, Pause, Trash2, RefreshCw, 
  Sparkles, CheckCircle2, AlertCircle, Volume2, ExternalLink, Info
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { CartesiaVoiceItem } from './CartesiaVoiceSelectorModal';
import { 
  CARTESIA_SUPPORTED_LANGUAGES, 
  CARTESIA_REGIONAL_GROUPS 
} from '@/lib/cartesia-languages';

interface VoiceCloningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceCloned: (voice: CartesiaVoiceItem) => void;
}

export function VoiceCloningModal({
  isOpen,
  onClose,
  onVoiceCloned
}: VoiceCloningModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [mode, setMode] = useState<'upload' | 'record'>('record');

  // Audio file & recording state
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/wav');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  if (!isOpen) return null;

  const handleStartRecording = async () => {
    try {
      setCloneError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
          setAudioFileName(`mic_recording_${Date.now()}.wav`);
          setAudioMimeType('audio/wav');
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 30) {
            handleStopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      toast.error('Microphone access denied or unavailable');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCloneError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File exceeds 15MB limit');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setAudioBase64(reader.result as string);
      setAudioFileName(file.name);
      setAudioMimeType(file.type || 'audio/wav');
    };
  };

  const handleTogglePreviewAudio = () => {
    if (!audioBase64) return;

    if (isPlayingPreview && previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
      return;
    }

    const audio = new Audio(audioBase64);
    previewAudioRef.current = audio;
    setIsPlayingPreview(true);

    audio.onended = () => setIsPlayingPreview(false);
    audio.onerror = () => setIsPlayingPreview(false);
    audio.play();
  };

  const handleClearAudio = () => {
    if (previewAudioRef.current) previewAudioRef.current.pause();
    setAudioBase64(null);
    setAudioFileName('');
    setRecordingSeconds(0);
    setIsPlayingPreview(false);
    setCloneError(null);
  };

  const handleSubmitClone = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloneError(null);

    if (!name.trim()) {
      toast.error('Please enter a voice name');
      return;
    }

    if (!audioBase64) {
      toast.error('Please record or upload a speech sample');
      return;
    }

    try {
      setCloning(true);
      const res = await api.post('/api/v1/voiceforce/voices/clone', {
        name: name.trim(),
        description: description.trim() || 'Custom Company Voice Clone',
        language,
        audioBase64,
        filename: audioFileName,
        mimeType: audioMimeType
      });

      if (res.data?.success && res.data.data) {
        toast.success(`🎉 Voice "${name}" cloned successfully!`);
        onVoiceCloned(res.data.data);
        onClose();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Voice cloning failed';
      setCloneError(errMsg);
      toast.error(errMsg);
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-950/30 dark:to-indigo-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Instant AI Voice Cloning
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Clone any executive, founder, or spokesperson voice in 10 seconds.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmitClone} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Cloud Sync Tip Banner */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Automatic Cartesia Cloud Sync</p>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                Any voice cloned in your <a href="https://play.cartesia.ai/voices" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-indigo-500 inline-flex items-center gap-0.5">Cartesia Console <ExternalLink className="w-2.5 h-2.5" /></a> automatically syncs here in real time.
              </p>
            </div>
          </div>

          {/* Error Notice with Actionable Links */}
          {cloneError && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col gap-2 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed font-medium">{cloneError}</p>
              </div>
              <div className="flex items-center gap-2 pl-6 pt-1">
                <a
                  href="https://play.cartesia.ai/voices"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-all"
                >
                  <span>Clone on Cartesia Console</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://play.cartesia.ai/subscription"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold text-[11px] flex items-center gap-1 transition-all"
                >
                  <span>Upgrade Cartesia API</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Voice Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex (CEO Voice) or Dr. Sarah"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                <span>Primary Language</span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold lowercase">50+ languages</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white outline-none cursor-pointer font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              >
                {CARTESIA_REGIONAL_GROUPS.map((region) => {
                  const regionalLangs = CARTESIA_SUPPORTED_LANGUAGES.filter(l => l.region === region);
                  if (regionalLangs.length === 0) return null;
                  return (
                    <optgroup key={region} label={`─── ${region} ───`}>
                      {regionalLangs.map((lang) => (
                        <option key={lang.code} value={lang.baseCode}>
                          {lang.flag} {lang.nativeName} ({lang.name})
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                Description / Role
              </label>
              <input
                type="text"
                placeholder="e.g. Founder & Lead Closer"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Audio Input Tabs: Record or Upload */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Voice Audio Sample (5 - 30 Seconds) *
              </label>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => { setMode('record'); handleClearAudio(); }}
                  className={clsx(
                    "px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer",
                    mode === 'record' ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm" : "text-gray-500"
                  )}
                >
                  Record Mic
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('upload'); handleClearAudio(); }}
                  className={clsx(
                    "px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer",
                    mode === 'upload' ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm" : "text-gray-500"
                  )}
                >
                  Upload File
                </button>
              </div>
            </div>

            {mode === 'record' ? (
              <div className="p-5 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 bg-gray-50/50 dark:bg-gray-850/50">
                <div className={clsx(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                  isRecording 
                    ? "bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/40"
                    : audioBase64 
                      ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-300"
                      : "bg-purple-100 dark:bg-purple-950/60 text-purple-600"
                )}>
                  <Mic className="w-6 h-6" />
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                    {isRecording 
                      ? `Recording... ${recordingSeconds}s / 30s`
                      : audioBase64
                        ? 'Speech sample captured!'
                        : 'Record a clear speech clip of the person speaking'}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Speak naturally in a quiet room for 5 to 15 seconds.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!isRecording && !audioBase64 && (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Start Recording</span>
                    </button>
                  )}

                  {isRecording && (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Stop Recording ({recordingSeconds}s)</span>
                    </button>
                  )}

                  {audioBase64 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTogglePreviewAudio}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 hover:bg-purple-200 transition-colors cursor-pointer"
                      >
                        {isPlayingPreview ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>{isPlayingPreview ? 'Pause Sample' : 'Listen Recording'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClearAudio}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Re-record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 bg-gray-50/50 dark:bg-gray-850/50 relative">
                <input
                  type="file"
                  accept="audio/wav,audio/mp3,audio/mpeg,audio/m4a,audio/webm"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">
                    {audioFileName || 'Drop audio sample or click to upload'}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Supports WAV, MP3, M4A up to 15MB
                  </p>
                </div>

                {audioBase64 && (
                  <div className="flex items-center gap-2 relative z-10">
                    <button
                      type="button"
                      onClick={handleTogglePreviewAudio}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 hover:bg-purple-200 transition-colors cursor-pointer"
                    >
                      {isPlayingPreview ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      <span>{isPlayingPreview ? 'Pause' : 'Listen Sample'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAudio}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={cloning || !name.trim() || !audioBase64}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
            >
              {cloning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Cloning & Synthesizing Voice...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Clone & Register Voice</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
