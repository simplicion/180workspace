import React from "react";
import {
  Sliders,
  Move,
  Maximize2,
  RotateCw,
  Eye,
  Gauge,
  Crop,
  Layers,
  Sparkles,
  X,
} from "lucide-react";
import { VideoClip, Transform } from "@workspace/video-contracts";

interface ClipInspectorProps {
  selectedClip: VideoClip | null;
  onUpdateTransform: (transform: Transform) => void;
  onUpdateSpeed: (speed: number) => void;
  onClose: () => void;
}

export const ClipInspector: React.FC<ClipInspectorProps> = ({
  selectedClip,
  onUpdateTransform,
  onUpdateSpeed,
  onClose,
}) => {
  if (!selectedClip) return null;

  const { transform, speedMultiplier } = selectedClip;

  const handleScaleChange = (val: number) => {
    onUpdateTransform({
      ...transform,
      scale: { ...transform.scale, start: val, end: val },
    });
  };

  const handlePositionXChange = (val: number) => {
    onUpdateTransform({
      ...transform,
      position: { ...transform.position, x: val },
    });
  };

  const handlePositionYChange = (val: number) => {
    onUpdateTransform({
      ...transform,
      position: { ...transform.position, y: val },
    });
  };

  const handleRotationChange = (val: number) => {
    onUpdateTransform({
      ...transform,
      rotationDeg: val,
    });
  };

  const handleOpacityChange = (val: number) => {
    onUpdateTransform({
      ...transform,
      opacity: val,
    });
  };

  const handleResetTransform = () => {
    onUpdateTransform({
      scale: { start: 1.0, end: 1.0, easing: "spring" },
      position: { x: 0, y: 0 },
      anchor: { x: 0.5, y: 0.5 },
      rotationDeg: 0,
      opacity: 1.0,
    });
    onUpdateSpeed(1.0);
  };

  return (
    <div className="w-full flex-1 flex flex-col h-full select-none bg-[#0E1118]">
      {/* Header */}
      <div className="p-3 border-b border-[#222838] flex items-center justify-between bg-[#0E1118]">
        <div className="flex items-center space-x-2 text-indigo-400">
          <Sliders className="w-4 h-4" />
          <span className="font-semibold text-xs uppercase tracking-wider text-gray-200">Clip Inspector</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleResetTransform}
            className="text-[10px] font-mono text-gray-400 hover:text-white px-2 py-0.5 rounded border border-[#222838] hover:bg-[#1C2230] transition"
            title="Reset Transform to Defaults"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#1C2230] transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inspector Body */}
      <div className="p-3.5 overflow-y-auto flex-1 space-y-4 text-xs">
        {/* Clip Name */}
        <div className="bg-[#141822] p-2 rounded-lg border border-[#222838]">
          <span className="text-[9px] text-gray-500 block uppercase font-mono mb-0.5">Active Clip</span>
          <p className="text-gray-200 font-medium truncate text-xs">
            {selectedClip.sourcePath.split(/[\/\\]/).pop()}
          </p>
        </div>

        {/* 1. Spatial Scale */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-gray-300">
            <span className="flex items-center space-x-1.5 font-medium">
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Scale</span>
            </span>
            <span className="font-mono text-indigo-300">{(transform.scale.start * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="3.0"
            step="0.05"
            value={transform.scale.start}
            onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#141822] rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* 2. Position X & Y */}
        <div className="space-y-2">
          <span className="flex items-center space-x-1.5 text-gray-300 font-medium">
            <Move className="w-3.5 h-3.5 text-indigo-400" />
            <span>Position Offset (X / Y)</span>
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-gray-500 block font-mono mb-0.5">X Offset</label>
              <input
                type="number"
                step="0.05"
                min="-1"
                max="1"
                value={transform.position.x}
                onChange={(e) => handlePositionXChange(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#141822] border border-[#222838] rounded-md px-2 py-1 text-gray-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[9px] text-gray-500 block font-mono mb-0.5">Y Offset</label>
              <input
                type="number"
                step="0.05"
                min="-1"
                max="1"
                value={transform.position.y}
                onChange={(e) => handlePositionYChange(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#141822] border border-[#222838] rounded-md px-2 py-1 text-gray-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Rotation */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-gray-300">
            <span className="flex items-center space-x-1.5 font-medium">
              <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Rotation</span>
            </span>
            <span className="font-mono text-indigo-300">{transform.rotationDeg}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={transform.rotationDeg}
            onChange={(e) => handleRotationChange(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-[#141822] rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* 4. Opacity */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-gray-300">
            <span className="flex items-center space-x-1.5 font-medium">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              <span>Opacity</span>
            </span>
            <span className="font-mono text-indigo-300">{(transform.opacity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={transform.opacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#141822] rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>

        {/* 5. Speed Multiplier */}
        <div className="space-y-1.5 pt-2 border-t border-[#222838]">
          <div className="flex items-center justify-between text-gray-300">
            <span className="flex items-center space-x-1.5 font-medium">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>Speed Multiplier</span>
            </span>
            <span className="font-mono text-amber-300">{speedMultiplier.toFixed(2)}x</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[0.5, 1.0, 1.25, 2.0].map((s) => (
              <button
                key={s}
                onClick={() => onUpdateSpeed(s)}
                className={`py-1 rounded-md border text-[11px] font-mono transition ${
                  speedMultiplier === s
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-[#141822] border-[#222838] text-gray-400 hover:text-white"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
