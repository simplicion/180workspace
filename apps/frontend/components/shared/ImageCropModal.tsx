"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropModalProps {
  imageSrc: string;
  aspectRatio: number; // 1 for avatar (1:1), 16/9 for banner
  onCropComplete: (croppedBlob: Blob) => void;
  onClose: () => void;
  title?: string;
}

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
  aspectRatio,
  onCropComplete,
  onClose,
  title = "Crop Image",
}: ImageCropModalProps) {
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
    <div className="fixed inset-0 z-[100] bg-black/80 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/90 backdrop-blur-sm">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
        <h2 className="text-white font-semibold text-sm">{title}</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-full transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Apply"}
        </button>
      </div>

      {/* Crop Area */}
      <div className="flex-1 relative">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspectRatio}
          cropShape={aspectRatio === 1 ? "round" : "rect"}
          showGrid={true}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropCompleteCallback}
        />
      </div>

      {/* Controls */}
      <div className="bg-gray-900/90 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => setZoom(Math.max(1, zoom - 0.1))}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ZoomOut className="w-5 h-5 text-white" />
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-40 accent-blue-500"
          />
          <button
            onClick={() => setZoom(Math.min(3, zoom + 0.1))}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ZoomIn className="w-5 h-5 text-white" />
          </button>
          <div className="w-px h-6 bg-white/20" />
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <RotateCw className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
