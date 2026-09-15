import React, { useState, useRef } from "react";
import {
  Folder,
  Plus,
  Search,
  Download,
  Trash2,
  Copy,
  Edit2,
  Film,
  Play,
  Monitor,
  Smartphone,
  Square,
  Clock,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  MoreVertical,
  Upload,
  Sparkles,
  CheckCircle2,
  X,
  HardDrive,
  Calendar,
} from "lucide-react";
import { ProjectFolder, SavedProjectSummary, ProjectStorageService } from "../services/project-storage";
import { CompanyAIStatus } from "../services/tauri-bridge";

interface HomeScreenProps {
  onOpenProject: (projectId: string) => void;
  companyAIStatus?: CompanyAIStatus | null;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenProject,
  companyAIStatus,
}) => {
  const [folders, setFolders] = useState<ProjectFolder[]>(() => ProjectStorageService.getFolders());
  const [projects, setProjects] = useState<SavedProjectSummary[]>(() => ProjectStorageService.getProjects());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modals & Dialogs
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectAspect, setNewProjectAspect] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [newFolderName, setNewFolderName] = useState("");
  const [contextMenuFolder, setContextMenuFolder] = useState<{ id: string; x: number; y: number } | null>(null);

  const importFileInputRef = useRef<HTMLInputElement>(null);

  const refreshData = () => {
    setFolders(ProjectStorageService.getFolders());
    setProjects(ProjectStorageService.getProjects());
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    ProjectStorageService.createFolder(newFolderName, selectedFolderId);
    setNewFolderName("");
    setIsNewFolderModalOpen(false);
    refreshData();
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const created = ProjectStorageService.createBlankProject(
      newProjectName || "Untitled Project",
      selectedFolderId,
      newProjectAspect
    );
    setNewProjectName("");
    setIsNewProjectModalOpen(false);
    refreshData();
    onOpenProject(created.id);
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    ProjectStorageService.duplicateProject(id);
    refreshData();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this project?")) {
      ProjectStorageService.deleteProject(id);
      refreshData();
    }
  };

  const handleDownload = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    ProjectStorageService.downloadProjectBundle(id);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const imported = await ProjectStorageService.importProjectFile(e.target.files[0]);
        refreshData();
        onOpenProject(imported.id);
      } catch (err) {
        alert("Failed to parse .vproj project file: " + err);
      }
      e.target.value = "";
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolderId === null || p.folderId === selectedFolderId;
    return matchesSearch && matchesFolder;
  });

  const activeFolder = folders.find((f) => f.id === selectedFolderId);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="h-screen w-screen bg-[#050505] text-zinc-100 flex flex-col select-none overflow-hidden font-sans">
      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={importFileInputRef}
        onChange={handleImportFile}
        accept=".vproj,.json,.otio"
        className="hidden"
      />

      {/* 1. Top Global Navigation Bar */}
      <header className="h-14 border-b border-[#1F1F24] bg-[#0B0B0C] px-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20">
            <div className="w-5 h-5 rounded bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center font-bold text-xs text-white shadow-md shadow-indigo-500/30">
              180
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">Media Studio</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#141417] text-indigo-300 font-mono border border-indigo-500/30">
              Workspace Hub
            </span>
          </div>

          <div className="h-4 w-px bg-[#1F1F24]" />

          {companyAIStatus?.isConfigured && (
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="font-medium text-emerald-300">Ready</span>
            </div>
          )}
        </div>

        {/* Center Search Bar */}
        <div className="flex-1 max-w-md mx-6">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search projects, files or folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121215] border border-[#1F1F24] focus:border-indigo-500 text-xs text-zinc-200 placeholder-zinc-500 rounded-xl pl-9 pr-3 py-2 outline-none transition shadow-inner"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => importFileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 bg-[#141417] hover:bg-[#1F1F24] border border-[#1F1F24] transition active:scale-95"
            title="Import existing .vproj or .otio bundle"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import File</span>
          </button>

          <button
            onClick={() => setIsNewFolderModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 bg-[#141417] hover:bg-[#1F1F24] border border-[#1F1F24] transition active:scale-95"
          >
            <Folder className="w-3.5 h-3.5 text-amber-400" />
            <span>New Folder</span>
          </button>

          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </header>

      {/* 2. Body: Left Folder Tree + Right Project Canvas */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Folders Sidebar */}
        <aside className="w-64 border-r border-[#1F1F24] bg-[#0B0B0C] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#1F1F24] flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Workspace Files
            </span>
            <button
              onClick={() => setIsNewFolderModalOpen(true)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#141417] transition"
              title="Create New Folder"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 overflow-y-auto flex-1 space-y-1 text-xs">
            <button
              onClick={() => setSelectedFolderId(null)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition ${
                selectedFolderId === null
                  ? "bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/40"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#141417]"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Film className="w-4 h-4 text-indigo-400" />
                <span>All Projects</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-[#141417]">
                {projects.length}
              </span>
            </button>

            <div className="pt-3 pb-1 px-3">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                Folders ({folders.length})
              </span>
            </div>

            {folders.map((folder) => {
              const count = projects.filter((p) => p.folderId === folder.id).length;
              const isSelected = selectedFolderId === folder.id;

              return (
                <div
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenuFolder({ id: folder.id, x: e.clientX, y: e.clientY });
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition group ${
                    isSelected
                      ? "bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/40"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-[#141417]"
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-[#141417]">
                      {count}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete folder "${folder.name}"? (Projects will move to root)`)) {
                          ProjectStorageService.deleteFolder(folder.id);
                          if (selectedFolderId === folder.id) setSelectedFolderId(null);
                          refreshData();
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition"
                      title="Delete Folder"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Storage Telemetry Footer */}
          <div className="p-3 border-t border-[#1F1F24] bg-[#08080A] flex items-center space-x-2 text-[11px] text-zinc-400">
            <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-zinc-300 block">Offline-First Storage</span>
              <span className="text-[10px] text-zinc-500">Auto-saved to local NVRAM</span>
            </div>
          </div>
        </aside>

        {/* Right Projects Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#050505] overflow-hidden">
          {/* Breadcrumb & View Toggle Header */}
          <div className="h-11 border-b border-[#1F1F24] bg-[#0B0B0C]/90 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2 text-xs text-zinc-400">
              <button
                onClick={() => setSelectedFolderId(null)}
                className="hover:text-white transition"
              >
                Projects
              </button>
              {activeFolder && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="text-zinc-200 font-semibold">{activeFolder.name}</span>
                </>
              )}
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-500 font-mono text-[11px]">
                {filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"}
              </span>
            </div>

            <div className="flex items-center space-x-1 bg-[#121215] p-0.5 rounded-lg border border-[#1F1F24]">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition ${
                  viewMode === "grid" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:text-white"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition ${
                  viewMode === "list" ? "bg-indigo-600 text-white shadow" : "text-zinc-400 hover:text-white"
                }`}
                title="Table List View"
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Projects Viewport Container */}
          <div className="flex-1 p-6 overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-[#121215] border border-[#1F1F24] flex items-center justify-center text-zinc-400 mb-4">
                  <Film className="w-8 h-8 text-indigo-400/80" />
                </div>
                <h3 className="text-sm font-bold text-zinc-200">No projects found</h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4">
                  {selectedFolderId
                    ? "This folder is empty. Create a new project or move existing files into it."
                    : "Create your first project to start editing with precision cuts and kinetic captions."}
                </p>
                <button
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
                >
                  Create New Project
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* Grid View */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProjects.map((proj) => (
                  <div
                    key={proj.id}
                    onDoubleClick={() => onOpenProject(proj.id)}
                    className="group bg-[#0B0B0C] border border-[#1F1F24] hover:border-zinc-700 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-black transition-all flex flex-col cursor-pointer"
                  >
                    {/* Thumbnail Frame */}
                    <div
                      onClick={() => onOpenProject(proj.id)}
                      className="aspect-video w-full bg-[#101012] relative overflow-hidden flex items-center justify-center"
                    >
                      {proj.thumbnailUrl ? (
                        <img
                          src={proj.thumbnailUrl}
                          alt={proj.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#141418] to-[#08080A] flex flex-col items-center justify-center">
                          <Film className="w-8 h-8 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                        </div>
                      )}

                      {/* Hover Play Button Overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 transform scale-90 group-hover:scale-100 transition-transform">
                          <Play className="w-5 h-5 ml-0.5" />
                        </div>
                      </div>

                      {/* Aspect & Duration Pills */}
                      <div className="absolute bottom-2 left-2 flex items-center space-x-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-mono text-zinc-300 font-bold">
                          {proj.aspectRatio}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-mono text-indigo-300 font-semibold">
                          {proj.resolution.width}x{proj.resolution.height}
                        </span>
                      </div>

                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/90 backdrop-blur-md text-[10px] font-mono text-zinc-200 font-semibold">
                        {formatDuration(proj.durationSeconds)}
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-3.5 flex flex-col justify-between flex-1 space-y-3">
                      <div>
                        <h4
                          onClick={() => onOpenProject(proj.id)}
                          className="text-xs font-bold text-zinc-100 group-hover:text-indigo-400 transition-colors truncate"
                          title={proj.name}
                        >
                          {proj.name}
                        </h4>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">
                          Edited {new Date(proj.updatedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-[#1F1F24] flex items-center justify-between">
                        {/* Download Project File Button */}
                        <button
                          onClick={(e) => handleDownload(proj.id, e)}
                          className="flex items-center space-x-1 text-[11px] font-semibold text-indigo-300 hover:text-white px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 transition active:scale-95"
                          title="Download project manifest (.vproj bundle)"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export .vproj</span>
                        </button>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => handleDuplicate(proj.id, e)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#16161A] transition"
                            title="Duplicate Project"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(proj.id, e)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 transition"
                            title="Delete Project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List / Table View */
              <div className="bg-[#0B0B0C] border border-[#1F1F24] rounded-2xl overflow-hidden shadow-lg">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-[#121215] border-b border-[#1F1F24] text-[10px] font-mono text-zinc-400 uppercase">
                    <tr>
                      <th className="py-3 px-4">Project Name</th>
                      <th className="py-3 px-4">Aspect</th>
                      <th className="py-3 px-4">Resolution</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Last Modified</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#18181D]">
                    {filteredProjects.map((proj) => (
                      <tr
                        key={proj.id}
                        onDoubleClick={() => onOpenProject(proj.id)}
                        className="hover:bg-[#141417] transition cursor-pointer group"
                      >
                        <td className="py-3 px-4 flex items-center space-x-2 font-medium text-zinc-200">
                          <Film className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="truncate max-w-xs">{proj.name}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-400">{proj.aspectRatio}</td>
                        <td className="py-3 px-4 font-mono text-zinc-400">
                          {proj.resolution.width}x{proj.resolution.height}
                        </td>
                        <td className="py-3 px-4 font-mono text-indigo-400">
                          {formatDuration(proj.durationSeconds)}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                          {new Date(proj.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={(e) => handleDownload(proj.id, e)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition"
                              title="Export .vproj"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDuplicate(proj.id, e)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#16161A] transition"
                              title="Duplicate Project"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(proj.id, e)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 transition"
                              title="Delete Project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal: Create New Project */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B0B0D] border border-[#202025] rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#202025] pb-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                <Film className="w-4 h-4 text-indigo-400" />
                <span>Create New Video Project</span>
              </h3>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Project Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Next YouTube Short"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  autoFocus
                  className="w-full bg-[#121215] border border-[#202025] focus:border-indigo-500 text-xs text-zinc-200 rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "16:9", label: "16:9 Landscape", icon: Monitor },
                    { id: "9:16", label: "9:16 Vertical", icon: Smartphone },
                    { id: "1:1", label: "1:1 Square", icon: Square },
                  ].map((asp) => (
                    <button
                      key={asp.id}
                      type="button"
                      onClick={() => setNewProjectAspect(asp.id as any)}
                      className={`p-2.5 rounded-xl border text-center text-xs font-medium flex flex-col items-center space-y-1 transition ${
                        newProjectAspect === asp.id
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold"
                          : "bg-[#141417] border-[#202025] text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <asp.icon className="w-4 h-4" />
                      <span>{asp.id}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#202025]">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition"
                >
                  Create & Launch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create New Folder */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0B0B0D] border border-[#202025] rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#202025] pb-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                <Folder className="w-4 h-4 text-amber-400" />
                <span>New Project Folder</span>
              </h3>
              <button
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Folder Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Client Campaigns"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                  className="w-full bg-[#121215] border border-[#202025] focus:border-indigo-500 text-xs text-zinc-200 rounded-xl px-3 py-2 outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#202025]">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-md"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
