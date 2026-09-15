import { ProjectPackageManifest, RationalTimeMath } from "@workspace/video-contracts";

export interface ProjectFolder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  color?: string;
}

export interface SavedProjectSummary {
  id: string;
  name: string;
  folderId: string | null;
  durationSeconds: number;
  resolution: { width: number; height: number };
  fps: number;
  aspectRatio: "16:9" | "9:16" | "1:1";
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  manifest: ProjectPackageManifest;
}

const STORAGE_FOLDERS_KEY = "180_media_studio_folders";
const STORAGE_PROJECTS_KEY = "180_media_studio_projects";

// Default Seed Data
const DEFAULT_FOLDERS: ProjectFolder[] = [
  { id: "folder_social", name: "Shorts & Viral Reels", parentId: null, createdAt: new Date().toISOString(), color: "#3B82F6" },
  { id: "folder_product", name: "Product Walkthroughs", parentId: null, createdAt: new Date().toISOString(), color: "#10B981" },
  { id: "folder_client", name: "Client Deliverables", parentId: null, createdAt: new Date().toISOString(), color: "#F59E0B" },
];

const DEFAULT_SAMPLE_PROJECT: SavedProjectSummary = {
  id: "proj_auton_showcase",
  name: "180 Workspace Autonomous Showcase",
  folderId: "folder_social",
  durationSeconds: 15.0,
  resolution: { width: 1920, height: 1080 },
  fps: 30,
  aspectRatio: "16:9",
  thumbnailUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg",
  createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  updatedAt: new Date().toISOString(),
  manifest: {
    schemaVersion: 1,
    engineVersion: "0.1.0",
    project: {
      id: "proj_auton_showcase",
      name: "180 Workspace Autonomous Showcase",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    assets: [
      {
        id: "asset_sample_demo",
        name: "saas_platform_walkthrough.mp4",
        filePath: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        fileSizeBytes: 18 * 1024 * 1024,
        mimeType: "video/mp4",
        durationSeconds: 15.0,
        width: 1920,
        height: 1080,
        fps: 30,
        hasAudio: true,
        codecVideo: "h264",
        codecAudio: "aac",
        sha256Hash: "demo_hash_999",
      },
    ],
    editIR: {
      version: "1.0.0",
      meta: {
        projectId: "proj_auton_showcase",
        title: "180 Workspace Autonomous Showcase",
        targetAspect: "16:9",
        resolution: { width: 1920, height: 1080 },
        fps: { numerator: 30, denominator: 1 },
        totalDuration: RationalTimeMath.fromSeconds(15.0),
      },
      directorStyle: {
        preset: "MRBEAST_FAST",
        pacingMultiplier: 1.3,
        zoomAggressiveness: 0.8,
        brollFrequencySeconds: 8.0,
      },
      tracks: {
        videoTracks: [
          {
            id: "track_v1",
            type: "MAIN_VIDEO",
            zIndex: 0,
            clips: [
              {
                id: "clip_showcase_1",
                assetId: "asset_sample_demo",
                sourcePath: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                sourceRange: {
                  start: RationalTimeMath.fromSeconds(0.0),
                  duration: RationalTimeMath.fromSeconds(15.0),
                },
                timelineRange: {
                  start: RationalTimeMath.fromSeconds(0.0),
                  duration: RationalTimeMath.fromSeconds(15.0),
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
        audioTracks: [
          {
            id: "track_a1",
            type: "PRIMARY_VOICE",
            volumeDb: 0.0,
            duckWithSpeech: false,
            clips: [],
          },
          {
            id: "track_a2",
            type: "BGM",
            volumeDb: -6.0,
            duckWithSpeech: true,
            clips: [],
          },
        ],
        cameraTrack: [
          {
            id: "cam_showcase_1" as any,
            timeRange: {
              start: RationalTimeMath.fromSeconds(1.0),
              duration: RationalTimeMath.fromSeconds(2.5),
            },
            targetType: "FACE",
            targetCoords: { x: 0.5, y: 0.4 },
            scale: 1.25,
            spring: { stiffness: 180, damping: 18, mass: 1, overshootClamping: false },
            motionBlur: true,
          },
        ],
        captionTrack: [
          {
            id: "cap_showcase_1" as any,
            timeRange: {
              start: RationalTimeMath.fromSeconds(0.5),
              duration: RationalTimeMath.fromSeconds(2.0),
            },
            text: "AUTONOMOUS VIDEO EDITING",
            words: [
              { word: "AUTONOMOUS", start: RationalTimeMath.fromSeconds(0.5), end: RationalTimeMath.fromSeconds(1.4), highlight: true, scaleMultiplier: 1.1 },
              { word: "VIDEO", start: RationalTimeMath.fromSeconds(1.4), end: RationalTimeMath.fromSeconds(1.8), highlight: false, scaleMultiplier: 1.0 },
              { word: "EDITING", start: RationalTimeMath.fromSeconds(1.8), end: RationalTimeMath.fromSeconds(2.5), highlight: true, scaleMultiplier: 1.15 },
            ],
            style: {
              preset: "HORMOZI_BOUNCE",
              fontFamily: "Inter",
              fontSize: 48,
              textColor: "#FACC15",
              highlightColor: "#38BDF8",
              position: { x: 0.5, y: 0.8 },
              shadow: true,
            },
          },
        ],
      },
    },
    history: [],
  },
};

export class ProjectStorageService {
  // Folder Operations
  static getFolders(): ProjectFolder[] {
    if (typeof window === "undefined") return DEFAULT_FOLDERS;
    try {
      const stored = localStorage.getItem(STORAGE_FOLDERS_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(DEFAULT_FOLDERS));
        return DEFAULT_FOLDERS;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_FOLDERS;
    }
  }

  static createFolder(name: string, parentId: string | null = null): ProjectFolder {
    const folders = this.getFolders();
    const newFolder: ProjectFolder = {
      id: `folder_${Date.now()}`,
      name: name.trim() || "Untitled Folder",
      parentId,
      createdAt: new Date().toISOString(),
      color: "#3B82F6",
    };
    const updated = [newFolder, ...folders];
    localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(updated));
    return newFolder;
  }

  static renameFolder(id: string, newName: string): void {
    const folders = this.getFolders().map((f) => (f.id === id ? { ...f, name: newName.trim() } : f));
    localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(folders));
  }

  static deleteFolder(id: string): void {
    const folders = this.getFolders().filter((f) => f.id !== id && f.parentId !== id);
    localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(folders));

    // Move projects in this folder to root (null)
    const projects = this.getProjects().map((p) => (p.folderId === id ? { ...p, folderId: null } : p));
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
  }

  // Project Operations
  static getProjects(): SavedProjectSummary[] {
    if (typeof window === "undefined") return [DEFAULT_SAMPLE_PROJECT];
    try {
      const stored = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (!stored) {
        localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify([DEFAULT_SAMPLE_PROJECT]));
        return [DEFAULT_SAMPLE_PROJECT];
      }
      return JSON.parse(stored);
    } catch {
      return [DEFAULT_SAMPLE_PROJECT];
    }
  }

  static getProjectById(id: string): SavedProjectSummary | null {
    const all = this.getProjects();
    return all.find((p) => p.id === id) || null;
  }

  static createBlankProject(name: string, folderId: string | null = null, aspect: "16:9" | "9:16" | "1:1" = "16:9"): SavedProjectSummary {
    const id = `proj_${Date.now()}`;
    const cleanName = name.trim() || "Untitled Project";
    const res = aspect === "9:16" ? { width: 1080, height: 1920 } : aspect === "1:1" ? { width: 1080, height: 1080 } : { width: 1920, height: 1080 };

    const manifest: ProjectPackageManifest = {
      schemaVersion: 1,
      engineVersion: "0.1.0",
      project: {
        id,
        name: cleanName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      assets: [],
      editIR: {
        version: "1.0.0",
        meta: {
          projectId: id,
          title: cleanName,
          targetAspect: aspect,
          resolution: res,
          fps: { numerator: 30, denominator: 1 },
          totalDuration: RationalTimeMath.fromSeconds(5.0),
        },
        directorStyle: {
          preset: "MRBEAST_FAST",
          pacingMultiplier: 1.0,
          zoomAggressiveness: 0.5,
          brollFrequencySeconds: 10.0,
        },
        tracks: {
          videoTracks: [
            {
              id: "track_v1",
              type: "MAIN_VIDEO",
              zIndex: 0,
              clips: [],
            },
          ],
          audioTracks: [
            {
              id: "track_a1",
              type: "PRIMARY_VOICE",
              volumeDb: 0.0,
              duckWithSpeech: false,
              clips: [],
            },
            {
              id: "track_a2",
              type: "BGM",
              volumeDb: -6.0,
              duckWithSpeech: true,
              clips: [],
            },
          ],
          cameraTrack: [],
          captionTrack: [],
        },
      },
      history: [],
    };

    const newSummary: SavedProjectSummary = {
      id,
      name: cleanName,
      folderId,
      durationSeconds: 5.0,
      resolution: res,
      fps: 30,
      aspectRatio: aspect,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      manifest,
    };

    const projects = [newSummary, ...this.getProjects()];
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    return newSummary;
  }

  static loadProjectManifest(id: string): ProjectPackageManifest | null {
    const proj = this.getProjectById(id);
    return proj?.manifest || null;
  }

  static saveProject(manifest: ProjectPackageManifest): void {
    this.saveProjectManifest(manifest);
  }

  static saveProjectManifest(manifest: ProjectPackageManifest): void {
    const projects = this.getProjects();
    const duration = RationalTimeMath.toSeconds(manifest.editIR.meta.totalDuration);
    const aspect = (manifest.editIR.meta.targetAspect as any) || "16:9";

    const idx = projects.findIndex((p) => p.id === manifest.project.id);
    if (idx !== -1) {
      projects[idx] = {
        ...projects[idx],
        name: manifest.project.name,
        durationSeconds: duration,
        resolution: manifest.editIR.meta.resolution,
        aspectRatio: aspect,
        updatedAt: new Date().toISOString(),
        manifest,
      };
    } else {
      projects.unshift({
        id: manifest.project.id,
        name: manifest.project.name,
        folderId: null,
        durationSeconds: duration,
        resolution: manifest.editIR.meta.resolution,
        fps: manifest.editIR.meta.fps.numerator / manifest.editIR.meta.fps.denominator,
        aspectRatio: aspect,
        createdAt: manifest.project.createdAt,
        updatedAt: new Date().toISOString(),
        manifest,
      });
    }

    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
  }

  static duplicateProject(id: string): SavedProjectSummary | null {
    const original = this.getProjectById(id);
    if (!original) return null;

    const dupId = `proj_${Date.now()}`;
    const dupName = `${original.name} (Copy)`;

    const dupManifest: ProjectPackageManifest = {
      ...original.manifest,
      project: {
        ...original.manifest.project,
        id: dupId,
        name: dupName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      editIR: {
        ...original.manifest.editIR,
        meta: {
          ...original.manifest.editIR.meta,
          projectId: dupId,
          title: dupName,
        },
      },
    };

    const dupSummary: SavedProjectSummary = {
      ...original,
      id: dupId,
      name: dupName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      manifest: dupManifest,
    };

    const projects = [dupSummary, ...this.getProjects()];
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    return dupSummary;
  }

  static deleteProject(id: string): void {
    const projects = this.getProjects().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
  }

  static moveProjectToFolder(projectId: string, folderId: string | null): void {
    const projects = this.getProjects().map((p) => (p.id === projectId ? { ...p, folderId } : p));
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
  }

  // Export / Download .vproj Bundle
  static downloadProjectBundle(id: string): void {
    const project = this.getProjectById(id);
    if (!project) return;

    const jsonString = JSON.stringify(project.manifest, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.vproj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Import .vproj Bundle File
  static async importProjectFile(file: File): Promise<SavedProjectSummary> {
    const text = await file.text();
    const manifest = JSON.parse(text) as ProjectPackageManifest;
    const id = manifest.project?.id || `proj_imported_${Date.now()}`;
    const name = manifest.project?.name || file.name.replace(/\.vproj$/i, "");

    const summary: SavedProjectSummary = {
      id,
      name,
      folderId: null,
      durationSeconds: manifest.editIR ? RationalTimeMath.toSeconds(manifest.editIR.meta.totalDuration) : 10.0,
      resolution: manifest.editIR?.meta.resolution || { width: 1920, height: 1080 },
      fps: 30,
      aspectRatio: (manifest.editIR?.meta.targetAspect as any) || "16:9",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      manifest,
    };

    const projects = [summary, ...this.getProjects().filter((p) => p.id !== id)];
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    return summary;
  }
}
