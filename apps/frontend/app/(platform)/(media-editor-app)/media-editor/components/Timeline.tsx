import React, { useRef, useState, useEffect } from "react";
import {
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  Camera,
  Subtitles,
  Volume2,
  VolumeX,
  Film,
  Sparkles,
  Layers,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Magnet,
  Maximize2,
  Copy,
  Keyboard,
} from "lucide-react";
import {
  EditIR,
  RationalTimeMath,
  VideoClip,
  CameraZoomKeyframe,
  CaptionSegment,
} from "@workspace/video-contracts";

interface TimelineProps {
  editIR: EditIR;
  currentTimeSeconds: number;
  zoomLevel: number;
  selectedClipId: string | null;
  height?: number;
  onSelectClip: (id: string | null) => void;
  onSeek: (seconds: number) => void;
  onZoomChange: (newZoom: number) => void;
  onSplitClip: () => void;
  onDeleteSelectedClip: () => void;
  onUpdateClipTiming?: (clipId: string, newStartSec: number, newDurationSec: number) => void;
  onCommitHistory?: () => void;
  onDuplicateClip?: () => void;
  onOpenShortcuts?: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  editIR,
  currentTimeSeconds,
  zoomLevel,
  selectedClipId,
  height,
  onSelectClip,
  onSeek,
  onZoomChange,
  onSplitClip,
  onDeleteSelectedClip,
  onUpdateClipTiming,
  onCommitHistory,
  onDuplicateClip,
  onOpenShortcuts,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isSnappingEnabled, setIsSnappingEnabled] = useState(true);

  // Track control states
  const [mutedTracks, setMutedTracks] = useState<Record<string, boolean>>({});
  const [lockedTracks, setLockedTracks] = useState<Record<string, boolean>>({});
  const [hiddenTracks, setHiddenTracks] = useState<Record<string, boolean>>({});

  // Clip drag & trim state
  const [draggingClip, setDraggingClip] = useState<{
    id: string;
    mode: "move" | "trim-start" | "trim-end";
    startX: number;
    initialStart: number;
    initialDuration: number;
  } | null>(null);

  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    if (!timelineRef.current) return;
    const updateSize = () => {
      if (timelineRef.current) {
        setContainerWidth(timelineRef.current.clientWidth);
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(timelineRef.current);
    return () => observer.disconnect();
  }, []);

  const totalDurationSec = Math.max(1, RationalTimeMath.toSeconds(editIR.meta.totalDuration));
  const headerWidthPx = 180;
  const availableTrackWidth = Math.max(400, containerWidth - headerWidthPx - 40);

  // Base Pixels-Per-Second: fits the entire project duration across the available track area!
  // E.g., for a 5-second video in 1000px width: fitPps = 1000 / 5 = 200 px/sec.
  // Then at zoomLevel = 1.0 (Fit), the 5s video spans the FULL WIDTH of the timeline!
  const fitPps = Math.max(30, availableTrackWidth / totalDurationSec);
  const pixelsPerSecond = fitPps * zoomLevel;
  const timelineWidthPx = Math.max(availableTrackWidth, totalDurationSec * pixelsPerSecond + 120);

  // Convert client X to timeline seconds
  const clientXToSeconds = (clientX: number) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const clickX = clientX - rect.left + scrollLeft - headerWidthPx;
    const rawSec = Math.max(0, Math.min(totalDurationSec, clickX / pixelsPerSecond));
    return rawSec;
  };

  // Ruler & Track lane scrub mouse handlers
  const handleRulerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsScrubbing(true);
    const sec = clientXToSeconds(e.clientX);
    onSeek(sec);
  };

  const handleTrackAreaMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".timeline-clip")) return;
    setIsScrubbing(true);
    const sec = clientXToSeconds(e.clientX);
    onSeek(sec);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isScrubbing) {
        const sec = clientXToSeconds(e.clientX);
        onSeek(sec);
      } else if (draggingClip && onUpdateClipTiming) {
        const deltaPx = e.clientX - draggingClip.startX;
        const deltaSec = deltaPx / pixelsPerSecond;

        if (draggingClip.mode === "move") {
          let newStart = Math.max(0, draggingClip.initialStart + deltaSec);
          if (isSnappingEnabled && Math.abs(newStart - currentTimeSeconds) < 0.15) {
            newStart = currentTimeSeconds;
          }
          onUpdateClipTiming(draggingClip.id, newStart, draggingClip.initialDuration);
        } else if (draggingClip.mode === "trim-start") {
          const newStart = Math.max(0, Math.min(draggingClip.initialStart + draggingClip.initialDuration - 0.2, draggingClip.initialStart + deltaSec));
          const newDur = Math.max(0.2, draggingClip.initialDuration - (newStart - draggingClip.initialStart));
          onUpdateClipTiming(draggingClip.id, newStart, newDur);
        } else if (draggingClip.mode === "trim-end") {
          const newDur = Math.max(0.2, draggingClip.initialDuration + deltaSec);
          onUpdateClipTiming(draggingClip.id, draggingClip.initialStart, newDur);
        }
      }
    };

    const handleMouseUp = () => {
      if (isScrubbing) setIsScrubbing(false);
      if (draggingClip) {
        setDraggingClip(null);
        onCommitHistory?.();
      }
    };

    if (isScrubbing || draggingClip) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isScrubbing, draggingClip, isSnappingEnabled, currentTimeSeconds, pixelsPerSecond, onSeek, onUpdateClipTiming, onCommitHistory]);

  // Generate ruler tick marks spanning the entire scrollable timeline width
  const maxSec = Math.max(totalDurationSec, timelineWidthPx / pixelsPerSecond);
  const ticks: number[] = [];
  const step = pixelsPerSecond >= 140 ? 1 : pixelsPerSecond >= 55 ? 2 : 5;
  for (let s = 0; s <= Math.ceil(maxSec) + 1; s += step) {
    ticks.push(s);
  }

  const videoTrack = editIR.tracks.videoTracks[0];
  const cameraTrack = editIR.tracks.cameraTrack;
  const captionTrack = editIR.tracks.captionTrack;

  const toggleTrackMute = (trackId: string) => {
    setMutedTracks((prev) => ({ ...prev, [trackId]: !prev[trackId] }));
  };

  const toggleTrackLock = (trackId: string) => {
    setLockedTracks((prev) => ({ ...prev, [trackId]: !prev[trackId] }));
  };

  const toggleTrackHide = (trackId: string) => {
    setHiddenTracks((prev) => ({ ...prev, [trackId]: !prev[trackId] }));
  };

  // Format timecode MM:SS.FF
  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const f = Math.floor((sec % 1) * 30);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(f).padStart(2, "0")}`;
  };

  return (
    <div
      style={{ height: height ? `${height}px` : undefined }}
      className="h-72 border-t border-[#1F1F24] bg-[#0B0B0C] flex flex-col select-none relative z-20 shrink-0"
    >
      {/* Timeline Toolbar */}
      <div className="h-10 border-b border-[#1F1F24] bg-[#0E0E10] flex items-center justify-between px-3">
        {/* Left: Editing Tools */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={onSplitClip}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#141417] hover:bg-[#1F1F24] active:scale-95 text-xs font-semibold text-gray-200 border border-[#26262D] transition shadow-sm"
            title="Split Clip at Playhead (S)"
          >
            <Scissors className="w-3.5 h-3.5 text-zinc-300" />
            <span>Split</span>
            <span className="text-[10px] text-gray-500 font-mono">S</span>
          </button>

          <button
            onClick={onDeleteSelectedClip}
            disabled={!selectedClipId}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#141417] hover:bg-red-500/15 active:scale-95 text-xs font-semibold text-gray-200 hover:text-red-300 border border-[#26262D] disabled:opacity-25 disabled:pointer-events-none transition shadow-sm"
            title="Ripple Delete Clip (Del)"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Delete</span>
            <span className="text-[10px] text-gray-500 font-mono">Del</span>
          </button>

          {onDuplicateClip && (
            <button
              onClick={onDuplicateClip}
              disabled={!selectedClipId}
              className="flex items-center space-x-1 px-2 py-1 rounded-md bg-[#141417] hover:bg-[#1F1F24] text-xs font-medium text-gray-300 border border-[#26262D] disabled:opacity-25 disabled:pointer-events-none transition"
              title="Duplicate Clip (Ctrl+D)"
            >
              <Copy className="w-3 h-3 text-zinc-300" />
              <span>Duplicate</span>
            </button>
          )}

          <div className="h-4 w-px bg-[#1F1F24] mx-1" />

          {/* Snapping Magnet Toggle */}
          <button
            onClick={() => setIsSnappingEnabled(!isSnappingEnabled)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium border transition ${
              isSnappingEnabled
                ? "bg-[#181822] text-white border-zinc-500"
                : "bg-[#141417] text-gray-500 border-[#26262D] hover:text-gray-300"
            }`}
            title={isSnappingEnabled ? "Snapping Enabled (N)" : "Snapping Disabled"}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap</span>
          </button>

          <div className="h-4 w-px bg-[#1F1F24] mx-1" />

          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="flex items-center space-x-1 px-2 py-1 rounded-md bg-[#141417] hover:bg-[#1F1F24] text-xs font-medium text-gray-300 border border-[#26262D] transition shadow-sm ml-1"
              title="Keyboard Shortcuts (?)"
            >
              <Keyboard className="w-3.5 h-3.5 text-zinc-300" />
              <span>Hotkeys</span>
            </button>
          )}
        </div>

        {/* Right: Zoom Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onZoomChange(Math.max(0.5, zoomLevel - 0.25))}
            className="p-1 rounded-md bg-[#141417] hover:bg-[#1F1F24] text-gray-400 hover:text-gray-200 border border-[#26262D] transition"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={zoomLevel}
            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
            className="w-20 h-1.5 bg-[#16161A] rounded appearance-none cursor-pointer accent-indigo-500"
            title={`Zoom: ${Math.round(zoomLevel * 100)}%`}
          />
          <button
            onClick={() => onZoomChange(Math.min(3, zoomLevel + 0.25))}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#1F1F24] transition"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onZoomChange(1.0)}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-gray-400 hover:text-white hover:bg-[#1F1F24] border border-[#26262D] transition"
            title="Reset Zoom to Fit Timeline (100%)"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Main Multi-Track Scrollable Timeline Canvas */}
      <div
        ref={timelineRef}
        className="flex-1 overflow-x-auto overflow-y-auto relative bg-[#050505] flex"
      >
        {/* Left Track Headers (Fixed on Scroll) */}
        <div
          className="shrink-0 bg-surface/95 border-r border-surface-border sticky left-0 z-20 flex flex-col shadow-xl"
          style={{ width: `${headerWidthPx}px` }}
        >
          {/* Ruler Corner Header */}
          <div className="h-8 border-b border-surface-border bg-surface-subtle/90 px-3 flex items-center justify-between text-[10px] text-gray-400 font-mono">
            <span className="font-bold tracking-wider text-gray-300">TRACKS</span>
            <span className="text-[9px] text-gray-500">30 FPS</span>
          </div>

          {/* 1. Camera Zoom Track Header */}
          <div className="h-12 border-b border-surface-border px-3 flex items-center justify-between text-xs font-semibold text-amber-400 bg-surface/60">
            <div className="flex items-center space-x-1.5 truncate">
              <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Camera (C1)</span>
            </div>
            <div className="flex items-center space-x-1 text-gray-400">
              <button
                onClick={() => toggleTrackLock("c1")}
                className="p-1 hover:text-white transition"
              >
                {lockedTracks["c1"] ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* 2. Captions Track Header */}
          <div className="h-12 border-b border-surface-border px-3 flex items-center justify-between text-xs font-semibold text-cyan-400 bg-surface/60">
            <div className="flex items-center space-x-1.5 truncate">
              <Subtitles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">Captions (T1)</span>
            </div>
            <div className="flex items-center space-x-1 text-gray-400">
              <button
                onClick={() => toggleTrackHide("t1")}
                className="p-1 hover:text-white transition"
              >
                {hiddenTracks["t1"] ? <EyeOff className="w-3 h-3 text-rose-400" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* 3. Dynamic Video & Overlay Track Headers */}
          {editIR.tracks.videoTracks.map((vTrack, vIdx) => {
            const trackKey = `v_${vTrack.id || vIdx}`;
            const isMain = vTrack.type === "MAIN_VIDEO" || vIdx === 0;
            const trackLabel = isMain
              ? "Video (V1)"
              : vTrack.type === "B_ROLL_OVERLAY"
              ? `B-Roll (V${vIdx + 1})`
              : vTrack.type === "STICKER_OVERLAY"
              ? `Sticker (V${vIdx + 1})`
              : `Overlay (V${vIdx + 1})`;

            return (
              <div
                key={vTrack.id || vIdx}
                className={`h-16 border-b border-surface-border px-3 flex items-center justify-between text-xs font-semibold ${
                  isMain ? "text-zinc-300 bg-[#0A0A0D]" : "text-indigo-300 bg-[#0C0C12]"
                }`}
              >
                <div className="flex items-center space-x-1.5 truncate">
                  <Film className={`w-3.5 h-3.5 ${isMain ? "text-zinc-400" : "text-indigo-400"} shrink-0`} />
                  <span className="truncate">{trackLabel}</span>
                </div>
                <div className="flex items-center space-x-1 text-zinc-400">
                  <button
                    onClick={() => toggleTrackLock(trackKey)}
                    className="p-1 hover:text-white transition"
                    title={lockedTracks[trackKey] ? "Unlock track" : "Lock track"}
                  >
                    {lockedTracks[trackKey] ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => toggleTrackHide(trackKey)}
                    className="p-1 hover:text-white transition"
                    title={hiddenTracks[trackKey] ? "Show track" : "Hide track"}
                  >
                    {hiddenTracks[trackKey] ? <EyeOff className="w-3 h-3 text-rose-400" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })}

          {/* 4. Audio Dialogue Track Header */}
          <div className="h-12 border-b border-surface-border px-3 flex items-center justify-between text-xs font-semibold text-emerald-400 bg-surface/60">
            <div className="flex items-center space-x-1.5 truncate">
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Audio (A1)</span>
            </div>
            <div className="flex items-center space-x-1 text-gray-400">
              <button
                onClick={() => toggleTrackMute("a1")}
                className="p-1 hover:text-white transition"
              >
                {mutedTracks["a1"] ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Scrollable Tracks Area */}
        <div
          onMouseDown={handleTrackAreaMouseDown}
          className="relative flex-1 h-full cursor-pointer"
          style={{ width: `${timelineWidthPx}px` }}
        >
          {/* Top Time Ruler */}
          <div
            ref={rulerRef}
            onMouseDown={handleRulerMouseDown}
            className="h-8 border-b border-surface-border bg-surface-subtle/90 cursor-ew-resize relative select-none"
          >
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute top-0 bottom-0 border-l border-surface-border/60 flex items-center pl-1 text-[10px] text-gray-400 font-mono pointer-events-none"
                style={{ left: `${t * pixelsPerSecond}px` }}
              >
                {t}s
              </div>
            ))}
          </div>

          {/* Red Playhead Line & Marker */}
          <div
            className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center transition-all duration-75 ease-out"
            style={{ left: `${currentTimeSeconds * pixelsPerSecond}px` }}
          >
            {/* Playhead Marker */}
            <div className="w-3.5 h-3.5 bg-red-500 transform rotate-45 -mt-1 shadow-lg shadow-red-500/80 rounded-sm" />
            {/* Playhead Line */}
            <div className="w-0.5 flex-1 bg-red-500 shadow-md shadow-red-500/60" />
          </div>

          {/* 1. Camera Track Lane */}
          <div className="h-12 border-b border-surface-border/40 relative bg-[#09090B]/80 flex items-center">
            {cameraTrack.length > 0 ? (
              cameraTrack.map((cam) => {
                const startSec = RationalTimeMath.toSeconds(cam.timeRange.start);
                const durationSec = RationalTimeMath.toSeconds(cam.timeRange.duration);
                const widthPx = Math.max(48, durationSec * pixelsPerSecond);

                return (
                  <div
                    key={cam.id}
                    className="timeline-clip absolute top-1.5 bottom-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 px-2 flex items-center space-x-1.5 text-amber-300 text-[10px] font-mono shadow-sm cursor-default min-w-[48px] overflow-hidden"
                    style={{
                      left: `${startSec * pixelsPerSecond}px`,
                      width: `${widthPx}px`,
                    }}
                    title={`Auto-Zoom ${cam.scale}x (Spring Physics) [${startSec.toFixed(1)}s - ${(startSec + durationSec).toFixed(1)}s]`}
                  >
                    <Camera className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate font-bold whitespace-nowrap">Auto-Zoom {cam.scale}x</span>
                  </div>
                );
              })
            ) : (
              <div className="text-[10px] text-zinc-600 font-mono italic px-4 select-none pointer-events-none">
                No camera keyframes on C1
              </div>
            )}
          </div>

          {/* 2. Captions Track Lane */}
          <div className="h-12 border-b border-surface-border/40 relative bg-[#09090B]/80">
            {captionTrack.map((cap) => {
              const startSec = RationalTimeMath.toSeconds(cap.timeRange.start);
              const durationSec = RationalTimeMath.toSeconds(cap.timeRange.duration);
              return (
                <div
                  key={cap.id}
                  className="timeline-clip absolute top-1.5 bottom-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40 px-2.5 flex items-center space-x-1.5 text-cyan-300 text-[10px] font-semibold truncate shadow-sm cursor-default"
                  style={{
                    left: `${startSec * pixelsPerSecond}px`,
                    width: `${durationSec * pixelsPerSecond}px`,
                  }}
                >
                  <Subtitles className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">"{cap.text}"</span>
                </div>
              );
            })}
          </div>

          {/* 3. Dynamic Video & Overlay Track Lanes */}
          {editIR.tracks.videoTracks.map((vTrack, vIdx) => {
            const trackKey = `v_${vTrack.id || vIdx}`;
            const isMain = vTrack.type === "MAIN_VIDEO" || vIdx === 0;

            return (
              <div
                key={vTrack.id || vIdx}
                className={`h-16 border-b border-surface-border/40 relative ${
                  isMain ? "bg-[#0D0D0F]" : "bg-[#0B0B11]"
                }`}
              >
                {vTrack.clips.map((clip) => {
                  const startSec = RationalTimeMath.toSeconds(clip.timelineRange.start);
                  const durationSec = RationalTimeMath.toSeconds(clip.timelineRange.duration);
                  const isSelected = selectedClipId === clip.id;

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip.id);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip.id);
                        if (!lockedTracks[trackKey]) {
                          setDraggingClip({
                            id: clip.id,
                            mode: "move",
                            startX: e.clientX,
                            initialStart: startSec,
                            initialDuration: durationSec,
                          });
                        }
                      }}
                      className={`timeline-clip absolute top-1 bottom-1 rounded-xl bg-gradient-to-r ${
                        isMain
                          ? "from-[#141418] via-[#1A1A22] to-[#141418]"
                          : "from-[#161622] via-[#1E1E30] to-[#161622]"
                      } border ${
                        isSelected
                          ? "border-zinc-400 ring-1 ring-white/20 shadow-xl shadow-black/50"
                          : isMain
                          ? "border-[#262630] hover:border-zinc-500"
                          : "border-indigo-900/60 hover:border-indigo-500"
                      } p-2 flex flex-col justify-between cursor-grab active:cursor-grabbing transition-all group overflow-hidden`}
                      style={{
                        left: `${startSec * pixelsPerSecond}px`,
                        width: `${durationSec * pixelsPerSecond}px`,
                      }}
                    >
                      {/* Left Trim Handle */}
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          onSelectClip(clip.id);
                          setDraggingClip({
                            id: clip.id,
                            mode: "trim-start",
                            startX: e.clientX,
                            initialStart: startSec,
                            initialDuration: durationSec,
                          });
                        }}
                        className="absolute left-0 top-0 bottom-0 w-2.5 bg-white/0 group-hover:bg-white/20 hover:!bg-white cursor-ew-resize transition-colors rounded-l-xl z-10"
                        title="Drag to trim start"
                      />

                      {/* Header Row */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-200 font-semibold px-1">
                        <span className="truncate flex items-center space-x-1.5">
                          <Film className={`w-3.5 h-3.5 ${isMain ? "text-zinc-400" : "text-indigo-400"} shrink-0`} />
                          <span className="truncate">{clip.sourcePath.split(/[\/\\]/).pop()}</span>
                        </span>
                        <span className="text-[10px] font-mono text-zinc-300 bg-black/60 px-1.5 py-0.5 rounded border border-white/5">
                          {durationSec.toFixed(1)}s
                        </span>
                      </div>

                      {/* Footer Row */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 px-1">
                        <span>{isMain ? "Lossless Stream-Copy" : "Layer Overlay"}</span>
                        <span>{clip.speedMultiplier || 1.0}x</span>
                      </div>

                      {/* Right Trim Handle */}
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          onSelectClip(clip.id);
                          setDraggingClip({
                            id: clip.id,
                            mode: "trim-end",
                            startX: e.clientX,
                            initialStart: startSec,
                            initialDuration: durationSec,
                          });
                        }}
                        className="absolute right-0 top-0 bottom-0 w-2.5 bg-white/0 group-hover:bg-white/20 hover:!bg-white cursor-ew-resize transition-colors rounded-r-xl z-10"
                        title="Drag to trim end"
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* 4. Audio Waveform Track Lane */}
          <div className="h-12 border-b border-surface-border/40 relative bg-[#08080A] flex items-center">
            {editIR.tracks.audioTracks &&
            editIR.tracks.audioTracks[0]?.clips &&
            editIR.tracks.audioTracks[0].clips.length > 0 ? (
              editIR.tracks.audioTracks[0].clips.map((aClip) => {
                const startSec = RationalTimeMath.toSeconds(aClip.timelineRange.start);
                const durationSec = RationalTimeMath.toSeconds(aClip.timelineRange.duration);
                const clipWidthPx = durationSec * pixelsPerSecond;
                const barCount = Math.max(1, Math.floor(clipWidthPx / 6));

                return (
                  <div
                    key={aClip.id}
                    className="timeline-clip absolute top-1 bottom-1 rounded-lg bg-emerald-950/50 border border-emerald-500/40 px-2 flex items-center space-x-1 overflow-hidden group shadow-sm"
                    style={{
                      left: `${startSec * pixelsPerSecond}px`,
                      width: `${clipWidthPx}px`,
                    }}
                    title={`Audio Clip: ${aClip.sourcePath.split(/[\/\\]/).pop() || "Audio"} (${durationSec.toFixed(1)}s)`}
                  >
                    <div className="flex items-center space-x-0.5 h-full flex-1">
                      {Array.from({ length: barCount }).map((_, i) => {
                        const heightPercent = 25 + Math.abs(Math.sin(i * 0.45) * 65) + (i % 6 === 0 ? 15 : 0);
                        return (
                          <div
                            key={i}
                            className="w-1 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-full"
                            style={{ height: `${heightPercent}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : videoTrack && videoTrack.clips.length > 0 ? (
              /* Linked Primary Video Audio Waveform for active video clips */
              videoTrack.clips.map((vClip) => {
                const startSec = RationalTimeMath.toSeconds(vClip.timelineRange.start);
                const durationSec = RationalTimeMath.toSeconds(vClip.timelineRange.duration);
                const clipWidthPx = durationSec * pixelsPerSecond;
                const barCount = Math.max(1, Math.floor(clipWidthPx / 6));

                return (
                  <div
                    key={`v_audio_${vClip.id}`}
                    className="absolute top-1 bottom-1 rounded-lg bg-emerald-950/20 border border-emerald-500/20 px-2 flex items-center space-x-1 overflow-hidden"
                    style={{
                      left: `${startSec * pixelsPerSecond}px`,
                      width: `${clipWidthPx}px`,
                    }}
                    title={`Embedded Audio Track (${durationSec.toFixed(1)}s)`}
                  >
                    <div className="flex items-center space-x-0.5 h-full flex-1 opacity-70">
                      {Array.from({ length: barCount }).map((_, i) => {
                        const heightPercent = 20 + Math.abs(Math.sin(i * 0.45) * 60);
                        return (
                          <div
                            key={i}
                            className="w-1 bg-gradient-to-t from-emerald-700 to-emerald-400 rounded-full"
                            style={{ height: `${heightPercent}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              /* Clean Empty State when no clips exist */
              <div className="text-[10px] text-zinc-600 font-mono italic px-4 select-none pointer-events-none">
                No audio clips on track A1
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
