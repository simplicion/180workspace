import React, { useState } from "react";
import { Volume2, VolumeX, Mic, Music, Sparkles, Sliders, X, Radio } from "lucide-react";
import { AudioTrack } from "@workspace/video-contracts";

interface AudioMixerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  audioTracks: AudioTrack[];
  onUpdateTrackVolume: (trackId: string, volumeDb: number) => void;
  onToggleDucking: (enabled: boolean) => void;
  isDuckingEnabled: boolean;
}

const DEFAULT_CHANNELS: {
  id: string;
  name: string;
  type: "PRIMARY_VOICE" | "BGM" | "SFX" | "VOICEOVER";
  icon: any;
  defaultDb: number;
  color: string;
  meterColor: string;
}[] = [
  { id: "track_a1", name: "Dialogue (A1)", type: "PRIMARY_VOICE", icon: Mic, defaultDb: 0, color: "text-emerald-400 accent-emerald-500", meterColor: "from-emerald-500 to-teal-400" },
  { id: "track_a2", name: "BGM (A2)", type: "BGM", icon: Music, defaultDb: -6, color: "text-indigo-400 accent-indigo-500", meterColor: "from-indigo-500 to-purple-400" },
  { id: "track_a3", name: "SFX (A3)", type: "SFX", icon: Sparkles, defaultDb: -2, color: "text-amber-400 accent-amber-500", meterColor: "from-amber-500 to-yellow-400" },
];

export const AudioMixerPanel: React.FC<AudioMixerPanelProps> = ({
  isOpen,
  onClose,
  audioTracks,
  onUpdateTrackVolume,
  onToggleDucking,
  isDuckingEnabled,
}) => {
  const [mutedChannels, setMutedChannels] = useState<Record<string, boolean>>({});
  const [soloChannels, setSoloChannels] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleMute = (id: string) => {
    setMutedChannels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSolo = (id: string) => {
    setSoloChannels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Merge provided audioTracks or use defaults
  const channels = DEFAULT_CHANNELS.map((ch) => {
    const existing = audioTracks.find((t) => t.id === ch.id || t.type === ch.type);
    return {
      ...ch,
      id: existing?.id || ch.id,
      volumeDb: existing?.volumeDb ?? ch.defaultDb,
    };
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center space-x-2 text-emerald-400">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-100">Multi-Track Audio Mixer & Speech Ducking</h3>
              <p className="text-[11px] text-gray-400">Sidechain vocal ducking and per-channel gain faders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-surface transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mixer Faders Body */}
        <div className="p-6 space-y-6">
          {/* Ducking Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-300">Automated Vocal Ducking (Sidechain)</p>
                <p className="text-[11px] text-gray-400">
                  Automatically reduces BGM volume by -18dB whenever active dialogue is detected.
                </p>
              </div>
            </div>
            <button
              onClick={() => onToggleDucking(!isDuckingEnabled)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                isDuckingEnabled
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                  : "bg-surface border border-surface-border text-gray-400 hover:text-white"
              }`}
            >
              {isDuckingEnabled ? "ACTIVE" : "DISABLED"}
            </button>
          </div>

          {/* Track Channels Grid */}
          <div className="grid grid-cols-3 gap-4">
            {channels.map((ch) => {
              const Icon = ch.icon;
              const isMuted = Boolean(mutedChannels[ch.id]);
              const isSolo = Boolean(soloChannels[ch.id]);

              return (
                <div
                  key={ch.id}
                  className={`p-4 rounded-xl bg-surface-subtle border ${
                    isSolo
                      ? "border-amber-500/50 shadow-lg shadow-amber-500/10"
                      : isMuted
                      ? "border-surface-border opacity-60"
                      : "border-surface-border"
                  } flex flex-col items-center space-y-3 transition`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className={`flex items-center space-x-1.5 text-xs font-semibold ${ch.color.split(" ")[0]}`}>
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{ch.name}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => toggleMute(ch.id)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                          isMuted
                            ? "bg-rose-500 text-white shadow"
                            : "bg-surface border border-surface-border text-gray-400 hover:text-white"
                        }`}
                        title="Mute Track"
                      >
                        M
                      </button>
                      <button
                        onClick={() => toggleSolo(ch.id)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                          isSolo
                            ? "bg-amber-500 text-black font-extrabold shadow"
                            : "bg-surface border border-surface-border text-gray-400 hover:text-white"
                        }`}
                        title="Solo Track"
                      >
                        S
                      </button>
                    </div>
                  </div>

                  {/* Vertical Fader */}
                  <div className="h-36 w-full flex items-center justify-center relative">
                    {/* Simulated Peak Meter Bar alongside fader */}
                    <div className="absolute right-2 h-28 w-1.5 bg-gray-800 rounded-full overflow-hidden flex flex-col justify-end">
                      <div
                        className={`w-full bg-gradient-to-t ${ch.meterColor} rounded-full transition-all duration-75`}
                        style={{
                          height: isMuted ? "0%" : `${Math.min(100, Math.max(10, (ch.volumeDb + 24) * 3.3))}%`,
                        }}
                      />
                    </div>

                    <input
                      type="range"
                      min="-24"
                      max="6"
                      step="0.5"
                      value={ch.volumeDb}
                      onChange={(e) => onUpdateTrackVolume(ch.id, parseFloat(e.target.value))}
                      className={`w-28 -rotate-90 bg-surface-border rounded-lg appearance-none cursor-pointer ${ch.color.split(" ")[1]}`}
                    />
                  </div>

                  <div className="flex items-center justify-between w-full px-1">
                    <span className="text-[10px] text-gray-500 font-mono">Gain</span>
                    <span className="text-[11px] font-mono font-bold text-gray-200">
                      {ch.volumeDb > 0 ? `+${ch.volumeDb.toFixed(1)}` : ch.volumeDb.toFixed(1)} dB
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-border bg-surface-subtle flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            Real-time audio graph recomputes seamlessly
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-brand hover:bg-brand-hover transition shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
