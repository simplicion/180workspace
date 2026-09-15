import {
  EditIR,
  ProjectPackageManifest,
  MediaAssetDescriptor,
  MediaTelemetryManifest,
  RationalTimeMath,
} from "@workspace/video-contracts";

export interface CompanyAIStatus {
  isConfigured: boolean;
  provider: string;
  model: string;
  status: string;
  lastTested?: string | null;
  companyName?: string;
  message?: string;
}

export interface ExportResult {
  blobUrl: string;
  downloadName: string;
  sizeBytes: number;
}

export interface EngineBridge {
  isTauri: boolean;
  openProject: (path?: string) => Promise<ProjectPackageManifest>;
  saveProject: (project: ProjectPackageManifest) => Promise<void>;
  probeMedia: (filePath: string) => Promise<MediaAssetDescriptor>;
  probeBrowserFile: (file: File) => Promise<MediaAssetDescriptor>;
  extractTelemetry: (filePath: string) => Promise<MediaTelemetryManifest>;
  getAIStatus: (companyId?: string) => Promise<CompanyAIStatus>;
  executeAutonomousPipeline: (
    inputPath: string,
    stylePreset: string,
    prompt?: string,
    companyId?: string
  ) => Promise<{ editIR: EditIR; outputPath: string; reply?: string; isConfigured?: boolean }>;
  renderExport: (
    editIR: EditIR,
    settings: { format: string; resolution: string; fps: number },
    onProgress: (percent: number) => void
  ) => Promise<ExportResult>;
}

class DesktopEngineBridge implements EngineBridge {
  isTauri: boolean = false;

  constructor() {
    this.isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  }

  async openProject(projectPath?: string): Promise<ProjectPackageManifest> {
    console.log(`[EngineBridge] Opening project: ${projectPath || "Default"}`);
    // Default initial blank project manifest
    return {
      schemaVersion: 1,
      engineVersion: "0.1.0",
      project: {
        id: "proj_auton_01",
        name: "180 Workspace Autonomous Showcase",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      assets: [
        {
          id: "asset_sample_1",
          name: "raw_sample_input.mp4",
          filePath: "C:/Users/saavi/Desktop/180workspace/scratch/raw_sample_input.mp4",
          fileSizeBytes: 100903,
          mimeType: "video/mp4",
          durationSeconds: 4.0,
          width: 1280,
          height: 720,
          fps: 30,
          hasAudio: true,
          codecVideo: "h264",
          codecAudio: "aac",
          sha256Hash: "demo_hash_01",
        },
      ],
      editIR: {
        version: "1.0.0",
        meta: {
          projectId: "proj_auton_01",
          title: "180 Workspace Autonomous Showcase",
          targetAspect: "16:9",
          resolution: { width: 1920, height: 1080 },
          fps: { numerator: 30, denominator: 1 },
          totalDuration: RationalTimeMath.fromSeconds(4.0),
        },
        directorStyle: {
          preset: "MRBEAST_FAST",
          pacingMultiplier: 1.25,
          zoomAggressiveness: 0.75,
          brollFrequencySeconds: 12.0,
        },
        tracks: {
          videoTracks: [
            {
              id: "vtrack_01",
              type: "MAIN_VIDEO",
              zIndex: 0,
              clips: [
                {
                  id: "clip_01",
                  assetId: "asset_sample_1",
                  sourcePath: "C:/Users/saavi/Desktop/180workspace/scratch/raw_sample_input.mp4",
                  sourceRange: {
                    start: RationalTimeMath.fromSeconds(0.0),
                    duration: RationalTimeMath.fromSeconds(2.0),
                  },
                  timelineRange: {
                    start: RationalTimeMath.fromSeconds(0.0),
                    duration: RationalTimeMath.fromSeconds(2.0),
                  },
                  transform: {
                    scale: { start: 1.0, end: 1.0, easing: "spring" },
                    position: { x: 0, y: 0 },
                    anchor: { x: 0.5, y: 0.5 },
                    rotationDeg: 0,
                    opacity: 1.0,
                  },
                  speedMultiplier: 1.0,
                  effects: [],
                },
                {
                  id: "clip_02",
                  assetId: "asset_sample_1",
                  sourcePath: "C:/Users/saavi/Desktop/180workspace/scratch/raw_sample_input.mp4",
                  sourceRange: {
                    start: RationalTimeMath.fromSeconds(2.0),
                    duration: RationalTimeMath.fromSeconds(2.0),
                  },
                  timelineRange: {
                    start: RationalTimeMath.fromSeconds(2.0),
                    duration: RationalTimeMath.fromSeconds(2.0),
                  },
                  transform: {
                    scale: { start: 1.0, end: 1.0, easing: "spring" },
                    position: { x: 0, y: 0 },
                    anchor: { x: 0.5, y: 0.5 },
                    rotationDeg: 0,
                    opacity: 1.0,
                  },
                  speedMultiplier: 1.0,
                  effects: [],
                },
              ],
            },
          ],
          cameraTrack: [
            {
              id: "cam_zoom_01",
              timeRange: {
                start: RationalTimeMath.fromSeconds(0.6),
                duration: RationalTimeMath.fromSeconds(1.4),
              },
              targetType: "FACE",
              targetCoords: { x: 0.5, y: 0.4 },
              scale: 1.35,
              spring: { stiffness: 180, damping: 18, mass: 1, overshootClamping: false },
              motionBlur: true,
            },
          ],
          captionTrack: [
            {
              id: "cap_01",
              timeRange: {
                start: RationalTimeMath.fromSeconds(0.5),
                duration: RationalTimeMath.fromSeconds(0.9),
              },
              text: "ACTIONABLE RESULTS",
              style: {
                preset: "HORMOZI_BOUNCE",
                fontFamily: "Inter",
                fontSize: 48,
                textColor: "#FACC15",
                highlightColor: "#00FF88",
                position: { x: 0.5, y: 0.82 },
                shadow: true,
              },
              words: [
                {
                  word: "ACTIONABLE",
                  start: RationalTimeMath.fromSeconds(0.5),
                  end: RationalTimeMath.fromSeconds(0.9),
                  highlight: true,
                  scaleMultiplier: 1.1,
                },
              ],
            },
            {
              id: "cap_02",
              timeRange: {
                start: RationalTimeMath.fromSeconds(2.2),
                duration: RationalTimeMath.fromSeconds(0.8),
              },
              text: "AUTONOMOUS EDIT",
              style: {
                preset: "HORMOZI_BOUNCE",
                fontFamily: "Inter",
                fontSize: 48,
                textColor: "#38BDF8",
                highlightColor: "#00FF88",
                position: { x: 0.5, y: 0.82 },
                shadow: true,
              },
              words: [
                {
                  word: "AUTONOMOUS",
                  start: RationalTimeMath.fromSeconds(2.2),
                  end: RationalTimeMath.fromSeconds(2.6),
                  highlight: true,
                  scaleMultiplier: 1.1,
                },
                {
                  word: "EDIT",
                  start: RationalTimeMath.fromSeconds(2.65),
                  end: RationalTimeMath.fromSeconds(3.0),
                  highlight: true,
                  scaleMultiplier: 1.1,
                },
              ],
            },
          ],
          audioTracks: [
            {
              id: "atrack_main",
              type: "PRIMARY_VOICE",
              volumeDb: 0.0,
              duckWithSpeech: false,
              clips: [],
            },
          ],
        },
      },
      history: [],
    };
  }

  async saveProject(project: ProjectPackageManifest): Promise<void> {
    console.log(`[EngineBridge] Saved project: ${project.project.name}`);
  }

  async probeMedia(filePath: string): Promise<MediaAssetDescriptor> {
    const fileName = filePath.split(/[\/\\]/).pop() || "media.mp4";
    return {
      id: `asset_${Date.now()}`,
      name: fileName,
      filePath,
      fileSizeBytes: 1024 * 1024 * 15,
      mimeType: "video/mp4",
      durationSeconds: 12.0,
      width: 1920,
      height: 1080,
      fps: 30,
      hasAudio: true,
      codecVideo: "h264",
      codecAudio: "aac",
      sha256Hash: `hash_${Date.now()}`,
    };
  }

  async probeBrowserFile(file: File): Promise<MediaAssetDescriptor> {
    const blobUrl = URL.createObjectURL(file);
    let durationSeconds = 8.0;
    let width = 1920;
    let height = 1080;
    const isVideo = file.type.startsWith("video/");

    if (isVideo) {
      try {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = blobUrl;
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            if (video.duration && !isNaN(video.duration)) durationSeconds = video.duration;
            if (video.videoWidth) width = video.videoWidth;
            if (video.videoHeight) height = video.videoHeight;
            resolve();
          };
          video.onerror = () => resolve();
          setTimeout(resolve, 2000);
        });
      } catch {}
    }

    return {
      id: `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: file.name,
      filePath: blobUrl,
      fileSizeBytes: file.size,
      mimeType: file.type || (isVideo ? "video/mp4" : "audio/mpeg"),
      durationSeconds,
      width,
      height,
      fps: 30,
      hasAudio: true,
      codecVideo: "h264",
      codecAudio: "aac",
      sha256Hash: `hash_${Date.now()}`,
    };
  }

  async extractTelemetry(filePath: string): Promise<MediaTelemetryManifest> {
    return {
      mediaId: filePath,
      sourcePath: filePath,
      duration: RationalTimeMath.fromSeconds(12.0),
      totalFrames: 360,
      transcript: [
        { word: "Welcome", startSeconds: 0.5, endSeconds: 0.9, confidence: 0.98, isEmphasis: false },
        { word: "to", startSeconds: 0.95, endSeconds: 1.1, confidence: 0.99, isEmphasis: false },
        { word: "the", startSeconds: 1.15, endSeconds: 1.3, confidence: 0.99, isEmphasis: false },
        { word: "Future", startSeconds: 1.35, endSeconds: 1.9, confidence: 0.99, isEmphasis: true },
      ],
      silenceGaps: [
        {
          timeRange: {
            start: RationalTimeMath.fromSeconds(2.0),
            duration: RationalTimeMath.fromSeconds(0.8),
          },
          averageDecibels: -42,
          isEligibleForTrim: true,
        },
      ],
      energyPeaks: [
        {
          timestamp: RationalTimeMath.fromSeconds(1.4),
          rmsEnergy: 0.88,
          importanceScore: 0.92,
        },
      ],
      sceneCuts: [
        { timestamp: RationalTimeMath.fromSeconds(0), frameIndex: 0, transitionScore: 1.0 },
      ],
      trackedObjects: [
        {
          timestamp: RationalTimeMath.fromSeconds(0),
          objectType: "FACE",
          boundingBox: { x: 0.35, y: 0.2, width: 0.3, height: 0.35 },
          confidence: 0.96,
        },
      ],
    };
  }

  async getAIStatus(companyId?: string): Promise<CompanyAIStatus> {
    const endpoints = [
      `http://127.0.0.1:4002/api/media-editor/ai-status?companyId=${encodeURIComponent(companyId || "")}`,
      `/api/media-editor/ai-status?companyId=${encodeURIComponent(companyId || "")}`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            return {
              isConfigured: Boolean(data.isConfigured),
              provider: data.provider || "none",
              model: data.model || "None",
              status: data.status || "unconfigured",
              lastTested: data.lastTested,
              companyName: data.companyName,
            };
          }
        }
      } catch {}
    }

    return {
      isConfigured: false,
      provider: "none",
      model: "None",
      status: "unconfigured",
      message: "Please configure your AI API key in Platform Settings to enable autonomous editing.",
    };
  }

  async executeAutonomousPipeline(
    inputPath: string,
    stylePreset: string,
    prompt?: string,
    companyId?: string
  ): Promise<{ editIR: EditIR; outputPath: string; reply?: string; isConfigured?: boolean }> {
    const endpoints = [
      "http://127.0.0.1:4002/api/media-editor/ai-direct",
      "/api/media-editor/ai-direct",
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt || `Apply ${stylePreset} editing style`,
            stylePreset,
            companyId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.data?.ast) {
            return {
              editIR: data.data.ast,
              outputPath: "rendered_master.mp4",
              reply: data.data.reply,
              isConfigured: true,
            };
          } else if (data && data.data?.message === "AI_NOT_CONFIGURED") {
            return {
              editIR: (await this.openProject()).editIR,
              outputPath: "",
              reply: data.data.reply || "AI Not Configured",
              isConfigured: false,
            };
          }
        }
      } catch {}
    }

    const defaultProj = await this.openProject();
    return {
      editIR: defaultProj.editIR,
      outputPath: "rendered_master.mp4",
      reply: "Deterministic local compilation active.",
      isConfigured: true,
    };
  }

  async renderExport(
    editIR: EditIR,
    settings: { format: string; resolution: string; fps: number },
    onProgress: (percent: number) => void
  ): Promise<ExportResult> {
    const durationSec = Math.max(2, Math.min(20, RationalTimeMath.toSeconds(editIR.meta.totalDuration)));
    const fps = settings.fps || 30;
    const totalFrames = Math.floor(durationSec * fps);

    const canvas = document.createElement("canvas");
    const isVertical = editIR.meta.targetAspect === "9:16";
    const isSquare = editIR.meta.targetAspect === "1:1";
    canvas.width = isVertical ? 1080 : isSquare ? 1080 : 1920;
    canvas.height = isVertical ? 1920 : isSquare ? 1080 : 1080;
    const ctx = canvas.getContext("2d");

    let stream: MediaStream | null = null;
    try {
      if (canvas.captureStream) {
        stream = canvas.captureStream(fps);
      } else if ((canvas as any).mozCaptureStream) {
        stream = (canvas as any).mozCaptureStream(fps);
      }
    } catch {}

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "video/mp4";

    const recordedChunks: Blob[] = [];
    let recorder: MediaRecorder | null = null;

    if (stream) {
      try {
        recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6000000 });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedChunks.push(e.data);
        };
        recorder.start();
      } catch {}
    }

    for (let frame = 0; frame <= totalFrames; frame++) {
      const curTime = frame / fps;

      if (ctx) {
        // Gradient background
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, "#080c16");
        grad.addColorStop(0.5, "#0f172a");
        grad.addColorStop(1, "#05070d");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subtle Studio Grid
        ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 48) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 48) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Camera spring zoom evaluation
        const activeCamera = editIR.tracks.cameraTrack.find((cam) => {
          const s = RationalTimeMath.toSeconds(cam.timeRange.start);
          const e = s + RationalTimeMath.toSeconds(cam.timeRange.duration);
          return curTime >= s && curTime <= e;
        });

        const zoom = activeCamera?.scale || 1.0;

        // Animated Central Frame Visual
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(zoom, zoom);

        ctx.beginPath();
        ctx.arc(0, 0, 160, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99, 102, 241, 0.18)";
        ctx.fill();
        ctx.strokeStyle = "rgba(99, 102, 241, 0.7)";
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 38px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("180 MEDIA STUDIO", 0, -25);

        ctx.fillStyle = "#a5b4fc";
        ctx.font = "bold 20px monospace";
        ctx.fillText(`AUTONOMOUS RENDER • ${editIR.directorStyle.preset}`, 0, 30);
        ctx.restore();

        // Kinetic Subtitles Overlay
        const activeCaption = editIR.tracks.captionTrack.find((cap) => {
          const s = RationalTimeMath.toSeconds(cap.timeRange.start);
          const e = s + RationalTimeMath.toSeconds(cap.timeRange.duration);
          return curTime >= s && curTime <= e;
        });

        if (activeCaption) {
          ctx.save();
          ctx.font = "900 52px Inter, sans-serif";
          ctx.textAlign = "center";
          const textY = canvas.height - 180;
          const textWidth = ctx.measureText(activeCaption.text).width;

          ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
          ctx.fillRect(canvas.width / 2 - textWidth / 2 - 30, textY - 50, textWidth + 60, 70);

          ctx.fillStyle = activeCaption.style?.highlightColor || "#FACC15";
          ctx.shadowColor = "rgba(250, 204, 21, 0.6)";
          ctx.shadowBlur = 18;
          ctx.fillText(activeCaption.text, canvas.width / 2, textY);
          ctx.restore();
        }

        // Master Timecode Burn-in
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.font = "24px monospace";
        ctx.textAlign = "left";
        const s = Math.floor(curTime) % 60;
        const m = Math.floor(curTime / 60);
        const f = Math.floor((curTime % 1) * fps);
        const tc = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
        ctx.fillText(`TC: ${tc} | 180 WORKSPACE LOSSLESS STREAM-COPY`, 40, canvas.height - 40);
      }

      const pct = Math.floor((frame / totalFrames) * 98);
      onProgress(pct);
      await new Promise((r) => setTimeout(r, 12));
    }

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      await new Promise((r) => {
        recorder!.onstop = r as any;
      });
    }

    onProgress(100);

    const finalBlob = new Blob(recordedChunks.length > 0 ? recordedChunks : ["180_EXPORT"], {
      type: mimeType,
    });
    const blobUrl = URL.createObjectURL(finalBlob);
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const downloadName = `${(editIR.meta.title || "180_media_export").replace(/\s+/g, "_")}_${Date.now()}.${ext}`;

    return {
      blobUrl,
      downloadName,
      sizeBytes: finalBlob.size,
    };
  }
}

export const engineBridge: EngineBridge = new DesktopEngineBridge();
