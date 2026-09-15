import React, { useRef, useEffect, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Sparkles,
  Camera,
  ChevronDown,
  Repeat,
  Upload,
  Plus,
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
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrubberRef = useRef<HTMLDivElement>(null);
  const isDraggingScrubberRef = useRef(false);

  const totalDurationSec = Math.max(1, RationalTimeMath.toSeconds(editIR.meta.totalDuration));

  // Determine active video clip and asset at playhead
  const activeVideoClip = editIR.tracks.videoTracks[0]?.clips.find((c) => {
    const start = RationalTimeMath.toSeconds(c.timelineRange.start);
    const end = start + RationalTimeMath.toSeconds(c.timelineRange.duration);
    return currentTimeSeconds >= start && currentTimeSeconds <= end;
  });

  const activeAsset = activeVideoClip
    ? assets.find((a) => a.id === activeVideoClip.assetId) || {
        id: activeVideoClip.assetId,
        name: activeVideoClip.sourcePath.split(/[\/\\]/).pop() || "media",
        filePath: activeVideoClip.sourcePath,
        mimeType: activeVideoClip.sourcePath.match(/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i) ? "image/jpeg" : "video/mp4",
      }
    : null;

  const activeVideoSrc = activeAsset?.filePath?.startsWith("blob:") || activeAsset?.filePath?.startsWith("http")
    ? activeAsset.filePath
    : null;

  const isImage = Boolean(
    activeAsset?.mimeType?.startsWith("image/") ||
    activeAsset?.filePath?.match(/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i) ||
    activeVideoClip?.sourcePath?.match(/\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i)
  );

  // Active clip spatial transforms & crop
  const clipScale = activeVideoClip?.transform?.scale?.start ?? 1.0;
  const clipPosX = activeVideoClip?.transform?.position?.x ?? 0;
  const clipPosY = activeVideoClip?.transform?.position?.y ?? 0;
  const clipRotation = activeVideoClip?.transform?.rotationDeg ?? 0;
  const clipOpacity = activeVideoClip?.transform?.opacity ?? 1.0;
  const isSelectedClipActive = Boolean(selectedClipId && activeVideoClip?.id === selectedClipId);

  const crop = activeVideoClip?.transform?.crop;
  const cropStyle = crop && (crop.top || crop.bottom || crop.left || crop.right)
    ? `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`
    : undefined;

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
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

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

  // Scrubber drag & click seek
  const handleScrubberSeek = (clientX: number) => {
    if (!scrubberRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(ratio * totalDurationSec);
  };

  const handleScrubberMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingScrubberRef.current = true;
    handleScrubberSeek(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingScrubberRef.current) {
        handleScrubberSeek(moveEvent.clientX);
      }
    };

    const onMouseUp = () => {
      isDraggingScrubberRef.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Capture current video frame snapshot as PNG
  const handleTakeSnapshot = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `snapshot_${currentFrame}_${currentTimecodeFormatted.replace(/:/g, "-")}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.warn("Frame snapshot error:", err);
    }
  };

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

  // SMPTE Timecode and Frames calculation matching DaVinci / professional NLE format: 00:00:00:22 [22]
  const fps = 30;
  const currentFrame = Math.max(0, Math.floor(currentTimeSeconds * fps));
  const currentFramesInSec = currentFrame % fps;
  const curTotalSec = Math.floor(currentTimeSeconds);
  const curS = curTotalSec % 60;
  const curM = Math.floor(curTotalSec / 60) % 60;
  const curH = Math.floor(curTotalSec / 3600);
  const currentTimecodeFormatted = `${String(curH).padStart(2, "0")}:${String(curM).padStart(2, "0")}:${String(curS).padStart(2, "0")}:${String(currentFramesInSec).padStart(2, "0")}`;

  const totalFrames = Math.max(1, Math.floor(totalDurationSec * fps));
  const totalFramesInSec = totalFrames % fps;
  const totTotalSec = Math.floor(totalDurationSec);
  const totS = totTotalSec % 60;
  const totM = Math.floor(totTotalSec / 60) % 60;
  const totH = Math.floor(totTotalSec / 3600);
  const totalTimecodeFormatted = `${String(totH).padStart(2, "0")}:${String(totM).padStart(2, "0")}:${String(totS).padStart(2, "0")}:${String(totalFramesInSec).padStart(2, "0")}`;

  const getAspectClass = () => {
    switch (aspectRatio) {
      case "9:16":
        return "aspect-[9/16] h-full max-h-full";
      case "1:1":
        return "aspect-square h-full max-h-full";
      case "16:9":
      default:
        return "aspect-video w-full max-w-full max-h-full";
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
      className="flex-1 bg-[#050505] flex flex-col items-stretch justify-between relative overflow-hidden select-none"
    >
      {/* Main Video Viewport Canvas - Clean, Full Elevation, Centered */}
      <div className="flex-1 w-full flex items-center justify-center relative p-3 min-h-0 overflow-hidden">
        <div
          className={`${getAspectClass()} relative bg-[#000000] border border-[#1F1F24] rounded-xl shadow-2xl shadow-black/90 overflow-hidden flex items-center justify-center transition-all duration-200`}
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
                {isImage ? (
                  <img
                    src={activeVideoSrc}
                    alt={activeAsset?.name || "Media"}
                    className="w-full h-full object-contain pointer-events-none select-none"
                    style={{ clipPath: cropStyle }}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src={activeVideoSrc}
                    playsInline
                    loop={isLooping}
                    className="w-full h-full object-contain"
                    style={{ clipPath: cropStyle }}
                  />
                )}

                {/* Live Selected Clip Highlight Frame */}
                {isSelectedClipActive && (
                  <div className="absolute inset-0 border-2 border-indigo-400/80 pointer-events-none rounded-lg flex flex-col justify-between p-2 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold bg-indigo-950/90 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/40">
                        Active Clip • {(clipScale * 100).toFixed(0)}% Scale {clipRotation ? `• ${clipRotation}°` : ""}{crop ? " • Cropped" : ""}
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
              /* High-End Obsidian Empty State with Official White Logo */
              <div className="w-full h-full bg-[#000000] flex flex-col items-center justify-center relative select-none p-6">
                {/* Subtle Dot Grid */}
                <div className="absolute inset-0 bg-[radial-gradient(#1F1F24_1px,transparent_1px)] [background-size:24px_24px] opacity-35 pointer-events-none" />

                <div className="z-10 flex flex-col items-center text-center max-w-sm">
                  {/* Official White Logo */}
                  <div className="w-24 h-24 mb-5 flex items-center justify-center relative group">
                    <img
                      src="/white-icon.svg"
                      alt="180 Media Studio"
                      className="w-20 h-20 object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-200 tracking-tight">
                    No Media in Timeline
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 mb-5 leading-relaxed">
                    Import video clips or images to start cutting, arranging, and editing your project.
                  </p>

                  {onOpenImport && (
                    <button
                      onClick={onOpenImport}
                      className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition active:scale-95 shadow-xl shadow-white/10 group cursor-pointer"
                      title="Import Video or Image Files"
                    >
                      <Plus className="w-4 h-4 text-black group-hover:rotate-90 transition-transform duration-200" />
                      <span>Add Media</span>
                    </button>
                  )}
                </div>
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
            <div className="absolute bottom-6 inset-x-0 flex justify-center z-20 pointer-events-none px-6">
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
        </div>
      </div>

      {/* Docked Video Controls Strip (Exact Pixel Match with Reference UI) */}
      <div className="w-full bg-[#0D0E12] border-t border-[#1F1F24] flex flex-col z-20 shrink-0 select-none">
        {/* Top Interactive Thin Scrubber Line with Sky Blue Progress */}
        <div
          ref={scrubberRef}
          onMouseDown={handleScrubberMouseDown}
          className="w-full h-1 bg-[#1A1C22] relative cursor-pointer group"
          title="Click or drag to scrub playhead"
        >
          <div
            className="h-full bg-sky-400 group-hover:bg-sky-300 transition-all relative"
            style={{
              width: `${Math.min(100, Math.max(0, (currentTimeSeconds / totalDurationSec) * 100))}%`,
            }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Controls Row */}
        <div className="h-10 px-3 flex items-center justify-between">
          {/* Left: SMPTE Timecode & Speed Selector & Mute */}
          <div className="flex items-center space-x-3">
            {/* Current Timecode & Frame: 00:00:00:22 [22] */}
            <div className="flex items-center space-x-1.5 font-mono text-xs select-none">
              <span className="text-sky-400 font-bold tracking-wider">{currentTimecodeFormatted}</span>
              <span className="text-sky-500/80 font-medium">[{currentFrame}]</span>
            </div>

            {/* Speed Multiplier Dropdown: x1 ▾ */}
            <div className="relative flex items-center">
              <select
                value={playbackSpeed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="bg-[#202227] hover:bg-[#282B32] text-zinc-300 border border-[#2E323A] rounded px-2 py-0.5 text-xs font-mono font-medium outline-none cursor-pointer appearance-none pr-5 transition"
                title="Playback Speed"
              >
                <option value={0.25}>x0.25</option>
                <option value={0.5}>x0.5</option>
                <option value={0.75}>x0.75</option>
                <option value={1}>x1</option>
                <option value={1.25}>x1.25</option>
                <option value={1.5}>x1.5</option>
                <option value={2}>x2</option>
              </select>
              <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-1.5 pointer-events-none" />
            </div>

            {/* Audio Mute Toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-1 rounded text-zinc-400 hover:text-white transition ${
                isMuted ? "text-rose-400" : ""
              }`}
              title={isMuted ? "Unmute Audio (M)" : "Mute Audio (M)"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Center: Playback Transport Buttons */}
          <div className="flex items-center space-x-2.5">
            {/* Jump to Start: |◀ */}
            <button
              onClick={() => onSeek(0)}
              className="p-1 text-zinc-400 hover:text-white transition"
              title="Jump to Start (Home)"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* Step Backward / Rewind: ◀◀ */}
            <button
              onClick={() => {
                if (onStepFrame) onStepFrame(-1);
                else onSeek(Math.max(0, currentTimeSeconds - 1 / fps));
              }}
              className="p-1 text-zinc-400 hover:text-white transition"
              title="Previous Frame (Left Arrow)"
            >
              <Rewind className="w-4 h-4 fill-current" />
            </button>

            {/* Play / Pause Primary Button: ▶ / ⏸ */}
            <button
              onClick={onTogglePlay}
              className="p-1 text-zinc-100 hover:text-white hover:scale-110 active:scale-95 transition"
              title="Play / Pause (Space)"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Step Forward / Fast Forward: ▶▶ */}
            <button
              onClick={() => {
                if (onStepFrame) onStepFrame(1);
                else onSeek(Math.min(totalDurationSec, currentTimeSeconds + 1 / fps));
              }}
              className="p-1 text-zinc-400 hover:text-white transition"
              title="Next Frame (Right Arrow)"
            >
              <FastForward className="w-4 h-4 fill-current" />
            </button>

            {/* Jump to End: ▶| */}
            <button
              onClick={() => onSeek(totalDurationSec)}
              className="p-1 text-zinc-400 hover:text-white transition"
              title="Jump to End (End)"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            {/* Loop Toggle: ⇄ */}
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`p-1 transition ${
                isLooping ? "text-sky-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
              title={isLooping ? "Loop Enabled" : "Loop Disabled"}
            >
              <Repeat className="w-4 h-4" />
            </button>

            {/* Status Badge: PAUSED / PLAYING */}
            <div className="bg-[#202227] border border-[#2E323A] px-2 py-0.5 rounded text-[10px] font-mono font-bold text-zinc-300 tracking-wider select-none">
              {isPlaying ? "PLAYING" : "PAUSED"}
            </div>

            {/* Snapshot Camera Button: 📷 */}
            <button
              onClick={handleTakeSnapshot}
              className="p-1 text-zinc-400 hover:text-white hover:scale-105 active:scale-95 transition"
              title="Capture Frame Snapshot (PNG)"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Aspect Ratio Switcher & Total Duration */}
          <div className="flex items-center space-x-3">
            {/* Aspect Ratio Switcher */}
            {onAspectRatioChange && (
              <div className="flex items-center space-x-0.5 bg-[#16181D] border border-[#262830] p-0.5 rounded-lg">
                <button
                  onClick={() => onAspectRatioChange("16:9")}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    aspectRatio === "16:9"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  title="Landscape (16:9)"
                >
                  16:9
                </button>
                <button
                  onClick={() => onAspectRatioChange("9:16")}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    aspectRatio === "9:16"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  title="Vertical Shorts / Reels (9:16)"
                >
                  9:16
                </button>
                <button
                  onClick={() => onAspectRatioChange("1:1")}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    aspectRatio === "1:1"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  title="Square (1:1)"
                >
                  1:1
                </button>
              </div>
            )}

            {/* Total Duration & Frames: [60] 00:00:02:00 */}
            <div className="flex items-center space-x-1.5 font-mono text-xs text-zinc-400 select-none">
              <span className="text-zinc-500 font-medium">[{totalFrames}]</span>
              <span className="tracking-wider">{totalTimecodeFormatted}</span>
            </div>

            {/* Fullscreen Viewport Toggle */}
            <button
              onClick={toggleFullscreen}
              className="text-zinc-400 hover:text-white p-1 rounded hover:bg-[#16181D] transition"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Viewport"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

