import React, { useRef, useEffect, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Sparkles,
  Camera,
  Layers,
  ChevronLeft,
  ChevronRight,
  Upload,
  Repeat,
  Monitor,
  Smartphone,
  Square,
} from "lucide-react";
import { EditIR, RationalTimeMath, MediaAssetDescriptor } from "@workspace/video-contracts";

interface CanvasViewportProps {
  editIR: EditIR;
  assets?: MediaAssetDescriptor[];
  currentTimeSeconds: number;
  isPlaying: boolean;
  aspectRatio: "16:9" | "9:16" | "1:1";
  selectedClipId?: string | null;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onStepFrame?: (direction: -1 | 1) => void;
  onAspectRatioChange?: (aspect: "16:9" | "9:16" | "1:1") => void;
  onOpenImport?: () => void;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  editIR,
  assets = [],
  currentTimeSeconds,
  isPlaying,
  aspectRatio,
  selectedClipId,
  onTogglePlay,
  onSeek,
  onStepFrame,
  onAspectRatioChange,
  onOpenImport,
}) => {
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const totalDurationSec = Math.max(1, RationalTimeMath.toSeconds(editIR.meta.totalDuration));

  // Determine active video clip and asset at playhead
  const activeVideoClip = editIR.tracks.videoTracks[0]?.clips.find((c) => {
    const start = RationalTimeMath.toSeconds(c.timelineRange.start);
    const end = start + RationalTimeMath.toSeconds(c.timelineRange.duration);
    return currentTimeSeconds >= start && currentTimeSeconds <= end;
  });

  const activeAsset = assets.find((a) => a.id === activeVideoClip?.assetId) || assets[0];
  const activeVideoSrc = activeAsset?.filePath?.startsWith("blob:") || activeAsset?.filePath?.startsWith("http")
    ? activeAsset.filePath
    : null;

  // Active clip spatial transforms
  const clipScale = activeVideoClip?.transform?.scale?.start ?? 1.0;
  const clipPosX = activeVideoClip?.transform?.position?.x ?? 0;
  const clipPosY = activeVideoClip?.transform?.position?.y ?? 0;
  const clipRotation = activeVideoClip?.transform?.rotationDeg ?? 0;
  const clipOpacity = activeVideoClip?.transform?.opacity ?? 1.0;
  const isSelectedClipActive = Boolean(selectedClipId && activeVideoClip?.id === selectedClipId);

  // Synchronize HTML5 video element with current playhead time
  useEffect(() => {
    if (videoRef.current) {
      const clipStart = activeVideoClip ? RationalTimeMath.toSeconds(activeVideoClip.timelineRange.start) : 0;
      const sourceStart = activeVideoClip ? RationalTimeMath.toSeconds(activeVideoClip.sourceRange.start) : 0;
      const targetTime = Math.max(0, sourceStart + (currentTimeSeconds - clipStart));
      if (Math.abs(videoRef.current.currentTime - targetTime) > 0.12) {
        videoRef.current.currentTime = targetTime;
      }
    }
  }, [currentTimeSeconds, activeVideoClip]);

  // Synchronize playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = activeVideoClip?.speedMultiplier || 1.0;
    }
  }, [activeVideoClip?.speedMultiplier]);

  // Synchronize play / pause
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Synchronize audio volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Analytical 2nd-order harmonic spring zoom evaluation
  const activeCameraKeyframe = editIR.tracks.cameraTrack.find((cam) => {
    const start = RationalTimeMath.toSeconds(cam.timeRange.start);
    const end = start + RationalTimeMath.toSeconds(cam.timeRange.duration);
    return currentTimeSeconds >= start && currentTimeSeconds <= end;
  });

  let zoomScale = 1.0;
  let zoomOriginX = 50;
  let zoomOriginY = 50;

  if (activeCameraKeyframe) {
    const start = RationalTimeMath.toSeconds(activeCameraKeyframe.timeRange.start);
    const elapsed = Math.max(0, currentTimeSeconds - start);
    const k = activeCameraKeyframe.spring?.stiffness || 180;
    const c = activeCameraKeyframe.spring?.damping || 18;
    const m = activeCameraKeyframe.spring?.mass || 1;
    const w0 = Math.sqrt(k / m);
    const zeta = c / (2 * Math.sqrt(k * m));
    const to = activeCameraKeyframe.scale;
    const x0 = 1.0 - to;

    if (zeta < 1.0) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      const decay = Math.exp(-zeta * w0 * elapsed);
      zoomScale = to + decay * (x0 * Math.cos(wd * elapsed) + ((zeta * w0 * x0) / wd) * Math.sin(wd * elapsed));
    } else {
      zoomScale = to + (x0 + w0 * x0 * elapsed) * Math.exp(-w0 * elapsed);
    }

    zoomOriginX = activeCameraKeyframe.targetCoords.x * 100;
    zoomOriginY = activeCameraKeyframe.targetCoords.y * 100;
  }

  // Active kinetic caption overlay
  const activeCaption = editIR.tracks.captionTrack.find((cap) => {
    const start = RationalTimeMath.toSeconds(cap.timeRange.start);
    const end = start + RationalTimeMath.toSeconds(cap.timeRange.duration);
    return currentTimeSeconds >= start && currentTimeSeconds <= end;
  });

  // Active layers count
  const activeVideoClipsCount = editIR.tracks.videoTracks.reduce((acc, tr) => {
    return (
      acc +
      tr.clips.filter((c) => {
        const start = RationalTimeMath.toSeconds(c.timelineRange.start);
        const end = start + RationalTimeMath.toSeconds(c.timelineRange.duration);
        return currentTimeSeconds >= start && currentTimeSeconds <= end;
      }).length
    );
  }, 0);

  // Timecode HH:MM:SS:FF
  const formatTimecode = (sec: number) => {
    const totalFrames = Math.floor(sec * 30);
    const frames = totalFrames % 30;
    const s = Math.floor(sec) % 60;
    const m = Math.floor(sec / 60) % 60;
    const h = Math.floor(sec / 3600);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
  };

  const getAspectClass = () => {
    switch (aspectRatio) {
      case "9:16":
        return "aspect-[9/16] h-[90%]";
      case "1:1":
        return "aspect-square h-[90%]";
      case "16:9":
      default:
        return "aspect-video w-[90%] max-h-[90%]";
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-[#050505] flex flex-col items-center justify-between p-4 relative overflow-hidden select-none"
    >
      {/* Top Viewport Toolbar */}
      <div className="flex items-center justify-between w-full max-w-4xl px-2 z-10">
        {/* Left: Timecode Readout */}
        <div className="flex items-center space-x-3 bg-surface/85 backdrop-blur-md border border-surface-border px-3.5 py-1.5 rounded-full text-xs text-gray-300 shadow-xl">
          <span className="font-mono text-indigo-400 font-bold tracking-wider">{formatTimecode(currentTimeSeconds)}</span>
          <span className="text-gray-600">/</span>
          <span className="font-mono text-gray-400">{formatTimecode(totalDurationSec)}</span>
          <div className="h-3 w-px bg-surface-border" />
          <span className="text-[11px] text-gray-400 font-medium">
            {editIR.meta.resolution.width}x{editIR.meta.resolution.height} @ 30fps
          </span>
          <div className="h-3 w-px bg-surface-border" />
          <span className="flex items-center space-x-1 text-[11px] text-emerald-400">
            <Layers className="w-3 h-3" />
            <span>{activeVideoClipsCount} active layers</span>
          </span>
        </div>

        {/* Right: Aspect Ratio Switcher Pills */}
        {onAspectRatioChange && (
          <div className="flex items-center space-x-1 bg-surface/85 backdrop-blur-md border border-surface-border p-1 rounded-xl shadow-lg">
            <button
              onClick={() => onAspectRatioChange("16:9")}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                aspectRatio === "16:9"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-400 hover:text-white hover:bg-surface-hover"
              }`}
              title="Landscape (16:9)"
            >
              <Monitor className="w-3 h-3" />
              <span>16:9</span>
            </button>
            <button
              onClick={() => onAspectRatioChange("9:16")}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                aspectRatio === "9:16"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-400 hover:text-white hover:bg-surface-hover"
              }`}
              title="Shorts / Reels / TikTok (9:16)"
            >
              <Smartphone className="w-3 h-3" />
              <span>9:16</span>
            </button>
            <button
              onClick={() => onAspectRatioChange("1:1")}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                aspectRatio === "1:1"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-gray-400 hover:text-white hover:bg-surface-hover"
              }`}
              title="Square (1:1)"
            >
              <Square className="w-3 h-3" />
              <span>1:1</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Video Viewport Canvas */}
      <div className="flex-1 w-full flex items-center justify-center relative my-2 min-h-0">
        <div
          className={`${getAspectClass()} relative bg-[#000000] border border-[#1F1F24] rounded-2xl shadow-2xl shadow-black/90 overflow-hidden flex items-center justify-center transition-all duration-200`}
        >
          {/* Zoomable Video Layer Container (Camera Spring Zoom) */}
          <div
            className="w-full h-full relative overflow-hidden flex items-center justify-center transition-transform duration-150 ease-out"
            style={{
              transform: `scale(${zoomScale})`,
              transformOrigin: `${zoomOriginX}% ${zoomOriginY}%`,
            }}
          >
            {activeVideoSrc ? (
              <div
                className="w-full h-full relative flex items-center justify-center transition-all duration-100 ease-out"
                style={{
                  transform: `translate(${clipPosX}px, ${clipPosY}px) scale(${clipScale}) rotate(${clipRotation}deg)`,
                  opacity: clipOpacity,
                }}
              >
                <video
                  ref={videoRef}
                  src={activeVideoSrc}
                  playsInline
                  loop={isLooping}
                  className="w-full h-full object-contain"
                />

                {/* Live Selected Clip Highlight Frame */}
                {isSelectedClipActive && (
                  <div className="absolute inset-0 border-2 border-indigo-400/80 pointer-events-none rounded-lg flex flex-col justify-between p-2 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold bg-indigo-950/90 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/40">
                        Active Clip • {(clipScale * 100).toFixed(0)}% Scale {clipRotation ? `• ${clipRotation}°` : ""}
                      </span>
                      <div className="w-2.5 h-2.5 border-t-2 border-r-2 border-indigo-400" />
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="w-2.5 h-2.5 border-b-2 border-l-2 border-indigo-400" />
                      <div className="w-2.5 h-2.5 border-b-2 border-r-2 border-indigo-400" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* High-End Empty / Preview Visual */
              <div className="w-full h-full bg-gradient-to-br from-[#0B0B0E] via-[#050507] to-[#000000] flex flex-col items-center justify-center relative select-none">
                {/* Visual Grid Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1F1F24_1px,transparent_1px),linear-gradient(to_bottom,#1F1F24_1px,transparent_1px)] bg-[size:36px_36px] opacity-25" />

                {/* Center Engine Emblem */}
                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-1 shadow-2xl shadow-indigo-500/25 z-10 flex items-center justify-center">
                  <div className="w-full h-full rounded-full bg-[#08080A] flex flex-col items-center justify-center text-center p-3">
                    <Sparkles className="w-7 h-7 text-indigo-400 mb-1 animate-pulse" />
                    <span className="text-[11px] font-extrabold text-white tracking-wider">180 STUDIO</span>
                    <span className="text-[9px] text-indigo-300 font-mono">Native Video</span>
                  </div>
                </div>

                <p className="text-xs font-medium text-gray-300 mt-4 z-10">
                  Ready to preview footage
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5 z-10">
                  Import media files into the Project Bin to play
                </p>

                {onOpenImport && (
                  <button
                    onClick={onOpenImport}
                    className="mt-3 z-10 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-xs font-semibold text-indigo-200 transition active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Footage</span>
                  </button>
                )}
              </div>
            )}

            {/* Target Reticle Overlay when Spring Zoom is Active */}
            {activeCameraKeyframe && (
              <div
                className="absolute w-28 h-28 border-2 border-indigo-400/80 rounded-xl pointer-events-none animate-pulse flex items-start justify-start p-1.5 shadow-lg shadow-indigo-500/30"
                style={{
                  left: `${zoomOriginX - 14}%`,
                  top: `${zoomOriginY - 14}%`,
                }}
              >
                <span className="text-[9px] font-mono font-bold text-indigo-200 bg-indigo-950/90 px-1.5 py-0.5 rounded border border-indigo-500/40">
                  FOCUS_ZOOM_{activeCameraKeyframe.scale}X
                </span>
              </div>
            )}
          </div>

          {/* Kinetic Subtitles Dynamic Overlay */}
          {activeCaption && (
            <div className="absolute bottom-10 inset-x-0 flex justify-center z-20 pointer-events-none px-6">
              <div className="px-5 py-2.5 rounded-2xl bg-black/85 backdrop-blur-lg border border-white/15 shadow-2xl text-center flex flex-wrap items-center justify-center gap-2 transition-transform duration-100 scale-105">
                {activeCaption.words && activeCaption.words.length > 0 ? (
                  activeCaption.words.map((w, idx) => {
                    const startSec = RationalTimeMath.toSeconds(w.start);
                    const endSec = RationalTimeMath.toSeconds(w.end);
                    const isWordActive = currentTimeSeconds >= startSec && currentTimeSeconds <= endSec;
                    return (
                      <span
                        key={idx}
                        className={`text-xl font-black tracking-wide uppercase transition-all duration-100 ${
                          isWordActive
                            ? "text-yellow-400 scale-110 drop-shadow-[0_0_15px_rgba(250,204,21,0.95)]"
                            : "text-white opacity-85"
                        }`}
                      >
                        {w.word}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-xl font-black tracking-wide uppercase text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.9)]">
                    {activeCaption.text}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Right Corner Mini Stereo VU Meter */}
          <div className="absolute bottom-3.5 right-3.5 flex items-center space-x-2 bg-black/75 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-lg">
            <div className="flex flex-col space-y-0.5">
              <span className="text-[8px] font-mono font-bold text-gray-400 leading-none">L</span>
              <span className="text-[8px] font-mono font-bold text-gray-400 leading-none">R</span>
            </div>
            <div className="flex flex-col space-y-1 w-14">
              <div className="w-full h-1.5 bg-[#16161A] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    isPlaying && !isMuted ? "bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 w-[78%]" : "w-0"
                  }`}
                />
              </div>
              <div className="w-full h-1.5 bg-[#16161A] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    isPlaying && !isMuted ? "bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 w-[72%]" : "w-0"
                  }`}
                />
              </div>
            </div>
            <span className="text-[9px] font-mono text-gray-300 font-semibold">{isPlaying && !isMuted ? "-8dB" : "-inf"}</span>
          </div>
        </div>
      </div>

      {/* Bottom Transport Controls Bar */}
      <div className="flex items-center space-x-4 bg-[#0B0B0C]/95 backdrop-blur-md border border-[#1F1F24] px-6 py-2.5 rounded-2xl shadow-2xl z-10">
        <button
          onClick={() => onSeek(0)}
          className="text-gray-400 hover:text-white transition p-1.5 rounded-lg hover:bg-[#16161A]"
          title="Jump to Start (Home)"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSeek(Math.max(0, currentTimeSeconds - 1 / 30))}
          className="text-gray-400 hover:text-white transition p-1.5 rounded-lg hover:bg-[#16161A] flex items-center text-xs font-mono"
          title="Previous Frame (Left Arrow)"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>-1F</span>
        </button>

        {/* Play / Pause Primary Button */}
        <button
          onClick={onTogglePlay}
          className="w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 transition transform"
          title="Play/Pause (Space)"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <button
          onClick={() => onSeek(Math.min(totalDurationSec, currentTimeSeconds + 1 / 30))}
          className="text-gray-400 hover:text-white transition p-1.5 rounded-lg hover:bg-[#16161A] flex items-center text-xs font-mono"
          title="Next Frame (Right Arrow)"
        >
          <span>+1F</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSeek(totalDurationSec)}
          className="text-gray-400 hover:text-white transition p-1.5 rounded-lg hover:bg-[#16161A]"
          title="Jump to End (End)"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-[#1F1F24]" />

        {/* Loop Toggle */}
        <button
          onClick={() => setIsLooping(!isLooping)}
          className={`p-1.5 rounded-lg transition ${
            isLooping ? "text-indigo-400 bg-indigo-500/20" : "text-gray-400 hover:text-white hover:bg-[#16161A]"
          }`}
          title={isLooping ? "Loop Enabled" : "Loop Disabled"}
        >
          <Repeat className="w-4 h-4" />
        </button>

        {/* Audio Volume Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-gray-400 hover:text-white transition p-1 rounded hover:bg-[#16161A]"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="w-20 accent-indigo-500 h-1.5 bg-[#16161A] rounded-lg cursor-pointer"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>

        <div className="h-4 w-px bg-[#1F1F24]" />

        {/* Fullscreen Viewport Toggle */}
        <button
          onClick={toggleFullscreen}
          className="text-gray-400 hover:text-white transition p-1.5 rounded-lg hover:bg-[#16161A]"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Viewport"}
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

