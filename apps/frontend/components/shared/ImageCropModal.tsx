"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { X, ZoomIn, ZoomOut, RotateCw, Check, Crop, Layers } from "lucide-react";
import clsx from "clsx";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AspectRatioOption {
  label: string;
  value: number;
  description?: string;
}

interface ImageCropModalProps {
  imageSrc: string;
  aspectRatio?: number; // Initial ratio
  allowedRatios?: AspectRatioOption[];
  cropShape?: "round" | "rect";
  onCropComplete: (croppedBlob: Blob) => void;
  onClose: () => void;
  title?: string;
}

const DEFAULT_BANNER_RATIOS: AspectRatioOption[] = [
  { label: "3:1 Wide Banner", value: 3 / 1, description: "Best for Profile Header" },
  { label: "16:9 Landscape", value: 16 / 9, description: "Standard Video & Banner" },
  { label: "4:1 Panoramic", value: 4 / 1, description: "Ultra-wide Header" },
  { label: "2:1 Classic", value: 2 / 1, description: "Compact Banner" },
  { label: "1:1 Square", value: 1 / 1, description: "Square Block" },
];

const DEFAULT_LOGO_RATIOS: AspectRatioOption[] = [
  { label: "1:1 Square / Circle", value: 1 / 1, description: "Standard Avatar / Logo" },
  { label: "4:3 Standard", value: 4 / 3, description: "Classic Logo Box" },
  { label: "16:9 Landscape", value: 16 / 9, description: "Horizontal Brandmark" },
];

// Creates a cropped image from the original
async function getCroppedImg(imageSrc: string, pixelCrop: CropArea): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas is empty"));
      },
      "image/jpeg",
      0.92
    );
  });
}

export default function ImageCropModal({
  imageSrc,
  aspectRatio = 16 / 9,
  allowedRatios,
  cropShape = "rect",
  onCropComplete,
  onClose,
  title = "Crop & Adjust Image",
}: ImageCropModalProps) {
  const ratios = allowedRatios || (cropShape === "round" || aspectRatio === 1 ? DEFAULT_LOGO_RATIOS : DEFAULT_BANNER_RATIOS);
  const [selectedRatio, setSelectedRatio] = useState<number>(aspectRatio);
  const [currentShape, setCurrentShape] = useState<"round" | "rect">(cropShape);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Lock scroll on mount, unlock on unmount
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const onCropCompleteCallback = useCallback(
    (_: any, croppedAreaPixels: CropArea) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleRatioChange = (val: number) => {
    setSelectedRatio(val);
    if (val === 1 && cropShape === "round") {
      setCurrentShape("round");
    } else {
      setCurrentShape("rect");
    }
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedBlob);
    } catch (e) {
      console.error("Crop failed:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col backdrop-blur-md animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gray-900/95 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-white font-bold text-sm sm:text-base flex items-center">
              <Crop className="w-4 h-4 mr-2 text-blue-400" />
              {title}
            </h2>
            <p className="text-xs text-gray-400 hidden sm:block">Drag to reposition, pinch or slider to zoom</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center"
          >
            {saving ? (
              <span>Applying...</span>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1.5" />
                Apply & Save
              </>
            )}
          </button>
        </div>
      </div>

      {/* Aspect Ratio Selector Toolbar */}
      {ratios.length > 1 && (
        <div className="bg-gray-900/80 border-b border-gray-800 px-4 py-2 overflow-x-auto scrollbar-hide flex items-center justify-center space-x-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mr-2 flex items-center shrink-0">
            <Layers className="w-3.5 h-3.5 mr-1 text-gray-400" /> Ratio:
          </span>
          {ratios.map((r, i) => {
            const isActive = Math.abs(selectedRatio - r.value) < 0.01;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleRatioChange(r.value)}
                className={clsx(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 flex items-center",
                  isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-500/30"
                    : "bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700"
                )}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Crop Area */}
      <div className="flex-1 relative bg-black/60">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={selectedRatio}
          cropShape={currentShape}
          showGrid={true}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropCompleteCallback}
        />
      </div>

      {/* Footer Controls */}
      <div className="bg-gray-900/95 border-t border-gray-800 px-6 py-3.5">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 max-w-xl mx-auto">
          {/* Zoom Slider */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setZoom(Math.max(1, zoom - 0.1))}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-28 sm:w-44 accent-blue-500 h-1.5 bg-gray-700 rounded-lg cursor-pointer"
            />
            <button
              onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-5 bg-gray-800 hidden sm:block" />

          {/* Rotate Button */}
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition-colors border border-gray-700"
            title="Rotate 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Rotate</span>
          </button>
        </div>
      </div>
    </div>
  );
}
