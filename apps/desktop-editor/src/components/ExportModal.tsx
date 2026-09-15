import React, { useState } from "react";
import {
  X,
  Download,
  Zap,
  CheckCircle2,
  Cpu,
  FileVideo,
  Sparkles,
  ExternalLink,
  Play,
  Share2,
} from "lucide-react";
import { EditIR } from "@workspace/video-contracts";
import { ExportResult } from "../services/tauri-bridge";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  editIR: EditIR;
  onStartExport: (settings: { format: string; resolution: string; fps: number }) => Promise<void>;
  exportProgress: number | null;
  isExporting: boolean;
  exportedResult?: ExportResult | null;
  exportedPath?: string | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  editIR,
  onStartExport,
  exportProgress,
  isExporting,
  exportedResult,
  exportedPath,
}) => {
  const [resolution, setResolution] = useState("1080p");
  const [fps, setFps] = useState(30);
  const [format, setFormat] = useState("mp4");

  if (!isOpen) return null;

  const handleExport = () => {
    onStartExport({
      format,
      resolution,
      fps,
    });
  };

  const handleDownloadFile = () => {
    if (!exportedResult) return;
    const a = document.createElement("a");
    a.href = exportedResult.blobUrl;
    a.download = exportedResult.downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-xl bg-surface/95 border border-surface-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 text-white shadow-md shadow-indigo-500/20">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-100">Export Video</h3>
              <p className="text-[11px] text-gray-400">Deterministic Smart Stream-Copy Engine</p>
            </div>
          </div>
          {!isExporting && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-surface-hover transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Smart Stream-Copy Banner */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-emerald-300">Lossless Stream-Copy Enabled</p>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                Untouched video segments bypass re-encoding and render at &gt;500 FPS with master source fidelity.
              </p>
            </div>
          </div>

          {!isExporting && !exportedResult && !exportedPath && (
            <div className="space-y-4">
              {/* Resolution Setting */}
              <div>
                <label className="text-xs font-semibold text-gray-200 block mb-2">
                  Export Resolution
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "1080p", label: "1080p (Full HD)", tag: "Recommended" },
                    { id: "4K", label: "4K (Ultra HD)", tag: "Crisp Master" },
                    { id: "720p", label: "720p (Standard)", tag: "Fast Render" },
                    { id: "9:16", label: "Vertical 1080x1920", tag: "Shorts / TikTok" },
                  ].map((res) => (
                    <button
                      key={res.id}
                      onClick={() => setResolution(res.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        resolution === res.id
                          ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                          : "bg-surface-subtle/80 border-surface-border text-gray-400 hover:text-gray-200 hover:bg-surface-hover"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{res.label}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface border border-surface-border text-gray-400">
                          {res.tag}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Framerate & Format Controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-200 block mb-1.5">
                    Framerate
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[30, 60].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => setFps(rate)}
                        className={`p-2 rounded-xl border text-xs font-bold transition text-center ${
                          fps === rate
                            ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                            : "bg-surface-subtle border-surface-border text-gray-400 hover:text-gray-200 hover:bg-surface-hover"
                        }`}
                      >
                        {rate} FPS
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-200 block mb-1.5">
                    Container Format
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["mp4", "webm"].map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setFormat(fmt)}
                        className={`p-2 rounded-xl border text-xs font-bold uppercase transition text-center ${
                          format === fmt
                            ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                            : "bg-surface-subtle border-surface-border text-gray-400 hover:text-gray-200 hover:bg-surface-hover"
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Export Rendering Progress State */}
          {isExporting && (
            <div className="py-6 space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30 animate-pulse shadow-lg shadow-indigo-500/25">
                <Cpu className="w-7 h-7 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-100">Rendering Master Video...</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Synthesizing audio, spring zoom framing & kinetic captions</p>
              </div>

              <div className="w-full bg-surface-subtle h-3 rounded-full overflow-hidden border border-surface-border">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full transition-all duration-150"
                  style={{ width: `${exportProgress || 0}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-gray-400 px-1">
                <span>{exportProgress || 0}% Completed</span>
                <span className="text-emerald-400">Stream-Copy @ &gt;500 FPS</span>
              </div>
            </div>
          )}

          {/* Export Completed State with Video Preview & Download */}
          {(exportedResult || exportedPath) && (
            <div className="py-2 space-y-3">
              <div className="flex items-center space-x-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-300">Video Rendered Successfully!</h4>
                  <p className="text-[11px] text-gray-400">
                    {exportedResult?.downloadName || "master_render.mp4"} • {exportedResult ? `${(exportedResult.sizeBytes / (1024 * 1024)).toFixed(2)} MB` : "Ready"}
                  </p>
                </div>
              </div>

              {/* Video Player Preview */}
              {exportedResult?.blobUrl && (
                <div className="rounded-xl overflow-hidden border border-surface-border bg-black/60 shadow-xl">
                  <video
                    src={exportedResult.blobUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full max-h-52 object-contain bg-black"
                  />
                </div>
              )}

              {/* Primary Download Button */}
              {exportedResult ? (
                <button
                  onClick={handleDownloadFile}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-600 hover:from-indigo-500 hover:to-pink-500 active:scale-98 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 flex items-center justify-center space-x-2 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Video File ({exportedResult.downloadName})</span>
                </button>
              ) : (
                <div className="text-xs text-gray-400 font-mono break-all bg-surface-subtle p-2.5 rounded-xl border border-surface-border">
                  {exportedPath}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-border bg-surface-subtle/80 flex items-center justify-end space-x-2.5">
          {!isExporting && !exportedResult && !exportedPath && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 active:scale-95 shadow-lg shadow-indigo-600/30 transition"
              >
                Start Export
              </button>
            </>
          )}

          {(exportedResult || exportedPath) && (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-gray-200 bg-surface hover:bg-surface-hover border border-surface-border transition"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
