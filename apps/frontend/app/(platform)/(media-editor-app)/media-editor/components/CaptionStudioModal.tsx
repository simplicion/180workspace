import React, { useState } from "react";
import {
  X,
  Subtitles,
  Plus,
  Trash2,
  Sparkles,
  Type,
  Palette,
  Clock,
  Flame,
  Coffee,
  Zap,
} from "lucide-react";
import { CaptionSegment, RationalTimeMath } from "@workspace/video-contracts";

interface CaptionStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  captions: CaptionSegment[];
  onUpdateCaptions: (captions: CaptionSegment[]) => void;
}

export const CaptionStudioModal: React.FC<CaptionStudioModalProps> = ({
  isOpen,
  onClose,
  captions,
  onUpdateCaptions,
}) => {
  if (!isOpen) return null;

  const [selectedCapIndex, setSelectedCapIndex] = useState(0);
  const activeCap = captions[selectedCapIndex];

  const handleTextChange = (newText: string) => {
    if (!activeCap) return;
    const words = newText.split(/\s+/).filter(Boolean);
    const startSec = RationalTimeMath.toSeconds(activeCap.timeRange.start);
    const durationSec = RationalTimeMath.toSeconds(activeCap.timeRange.duration);
    const wordDur = durationSec / Math.max(1, words.length);

    const updatedWords = words.map((w, idx) => ({
      word: w,
      start: RationalTimeMath.fromSeconds(startSec + idx * wordDur),
      end: RationalTimeMath.fromSeconds(startSec + (idx + 1) * wordDur),
      highlight: idx % 2 === 0,
      scaleMultiplier: 1.1,
    }));

    const updated = [...captions];
    updated[selectedCapIndex] = {
      ...activeCap,
      text: newText,
      words: updatedWords,
    };
    onUpdateCaptions(updated);
  };

  const handlePresetChange = (preset: "HORMOZI_BOUNCE" | "ALI_ABDAAL_CLEAN" | "BOLD_CENTER" | "MINIMAL_SUBTITLE") => {
    if (!activeCap) return;
    const updated = captions.map((c) => ({
      ...c,
      style: {
        ...c.style,
        preset,
        textColor: preset === "HORMOZI_BOUNCE" ? "#FACC15" : preset === "BOLD_CENTER" ? "#38BDF8" : "#FFFFFF",
        highlightColor: "#00FF88",
      },
    }));
    onUpdateCaptions(updated);
  };

  const handleAddCaption = () => {
    const newCap: CaptionSegment = {
      id: `cap_${Date.now()}` as any,
      timeRange: {
        start: RationalTimeMath.fromSeconds(captions.length * 2.0),
        duration: RationalTimeMath.fromSeconds(1.5),
      },
      text: "NEW SUBTITLE",
      words: [
        {
          word: "NEW",
          start: RationalTimeMath.fromSeconds(captions.length * 2.0),
          end: RationalTimeMath.fromSeconds(captions.length * 2.0 + 0.7),
          highlight: true,
          scaleMultiplier: 1.1,
        },
        {
          word: "SUBTITLE",
          start: RationalTimeMath.fromSeconds(captions.length * 2.0 + 0.75),
          end: RationalTimeMath.fromSeconds(captions.length * 2.0 + 1.5),
          highlight: false,
          scaleMultiplier: 1.0,
        },
      ],
      style: {
        preset: "HORMOZI_BOUNCE",
        fontFamily: "Inter",
        fontSize: 48,
        textColor: "#FACC15",
        highlightColor: "#00FF88",
        position: { x: 0.5, y: 0.8 },
        shadow: true,
      },
    };

    onUpdateCaptions([...captions, newCap]);
    setSelectedCapIndex(captions.length);
  };

  const handleDeleteCaption = (index: number) => {
    const updated = captions.filter((_, i) => i !== index);
    onUpdateCaptions(updated);
    setSelectedCapIndex(Math.max(0, index - 1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-4xl bg-surface border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[650px] animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-cyan-400">
            <Subtitles className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-semibold text-gray-100">Kinetic Caption & Subtitle Studio</h3>
              <p className="text-[11px] text-gray-400">Word-by-word karaoke timing and retention animations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-surface-hover transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Studio Body */}
        <div className="flex-1 flex min-h-0">
          {/* Left: Caption Segments List */}
          <div className="w-80 border-r border-surface-border bg-surface-subtle/50 flex flex-col h-full">
            <div className="p-3 border-b border-surface-border flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Timeline Subtitles ({captions.length})
              </span>
              <button
                onClick={handleAddCaption}
                className="flex items-center space-x-1 px-2 py-1 rounded bg-brand text-[11px] font-medium text-white hover:bg-brand-hover transition shadow-sm"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>

            <div className="p-2 overflow-y-auto flex-1 space-y-2">
              {captions.map((cap, idx) => {
                const startSec = RationalTimeMath.toSeconds(cap.timeRange.start);
                const isSelected = selectedCapIndex === idx;

                return (
                  <div
                    key={cap.id}
                    onClick={() => setSelectedCapIndex(idx)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-200 shadow-md"
                        : "bg-surface border-surface-border hover:border-surface-hover text-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 mb-1">
                      <span>#{idx + 1} • {startSec.toFixed(2)}s</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCaption(idx);
                        }}
                        className="text-gray-500 hover:text-red-400 p-0.5 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs font-semibold truncate">"{cap.text}"</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Active Caption Editor */}
          {activeCap ? (
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Preset Selector */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-2">
                  Subtitle Style Presets
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "HORMOZI_BOUNCE", name: "Hormozi Bounce", icon: Flame, color: "text-amber-400 border-amber-500/40" },
                    { id: "ALI_ABDAAL_CLEAN", name: "Abdaal Clean", icon: Coffee, color: "text-teal-400 border-teal-500/40" },
                    { id: "BOLD_CENTER", name: "Neon Punch", icon: Zap, color: "text-cyan-400 border-cyan-500/40" },
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = activeCap.style.preset === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handlePresetChange(p.id as any)}
                        className={`p-3 rounded-xl border flex items-center space-x-2 text-xs font-semibold transition ${
                          isSelected
                            ? `bg-surface border-cyan-500 text-white shadow-lg`
                            : `bg-surface-subtle border-surface-border text-gray-400 hover:text-white`
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subtitle Text Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">
                  Subtitle Text Content
                </label>
                <textarea
                  rows={2}
                  value={activeCap.text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="w-full bg-surface-subtle border border-surface-border rounded-xl p-3 text-sm text-gray-100 font-medium focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Word Timings Preview */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-2">
                  Karaoke Word Timings & Highlights
                </label>
                <div className="flex flex-wrap gap-2">
                  {activeCap.words?.map((w, wIdx) => {
                    const wStart = RationalTimeMath.toSeconds(w.start);
                    const wEnd = RationalTimeMath.toSeconds(w.end);
                    return (
                      <div
                        key={wIdx}
                        className={`px-3 py-1.5 rounded-xl border flex items-center space-x-2 text-xs font-bold ${
                          w.highlight
                            ? "bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm"
                            : "bg-surface-subtle border-surface-border text-gray-300"
                        }`}
                      >
                        <span>{w.word}</span>
                        <span className="text-[9px] font-mono text-gray-500">
                          {((wEnd - wStart) * 1000).toFixed(0)}ms
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-gray-500">
              Select or add a caption segment to begin editing.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-border bg-surface-subtle flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-brand hover:bg-brand-hover transition shadow-md"
          >
            Apply Captions
          </button>
        </div>
      </div>
    </div>
  );
};
