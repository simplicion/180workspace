//! Native media commands (probe / transcode) backed by the bundled FFmpeg sidecars.
//!
//! Security model: the web content that calls these commands is remote (https://app.180workspace.com). If that
//! origin were ever compromised (XSS, a malicious dependency), it must not be able to read or overwrite arbitrary
//! files on the user's disk. So:
//!  * no command takes an arbitrary path: a path is only accepted if it was returned by a native file picker in THIS
//!    process (`pick_media_files` for inputs, `pick_export_path` for outputs);
//!  * FFmpeg is never exposed as a generic "run this command" primitive: arguments are fixed here in Rust and only a
//!    small validated preset is chosen by the caller;
//!  * the shell plugin is registered but NO shell permission is granted to the web content (capabilities/main.json).

use std::{
    collections::HashSet,
    path::{Path, PathBuf},
    sync::Mutex,
};

use serde::Serialize;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::ShellExt;

/// Paths the user selected through a native dialog during this session (canonicalised).
#[derive(Default)]
pub struct AllowedPaths(Mutex<HashSet<PathBuf>>);

/// Windows canonicalisation yields `\\?\C:\...`; FFmpeg and the UI both prefer the plain form.
fn simplify(path: PathBuf) -> PathBuf {
    let s = path.to_string_lossy();
    match s.strip_prefix(r"\\?\") {
        Some(rest) if !rest.starts_with("UNC\\") => PathBuf::from(rest.to_string()),
        _ => path,
    }
}

impl AllowedPaths {
    /// Records an existing file the user just picked and returns its canonical string form.
    fn allow_existing(&self, path: &Path) -> Result<String, String> {
        let canon = simplify(
            path.canonicalize()
                .map_err(|e| format!("Cannot access {}: {e}", path.display()))?,
        );
        self.0
            .lock()
            .map_err(|_| "internal state error".to_string())?
            .insert(canon.clone());
        Ok(canon.to_string_lossy().into_owned())
    }

    /// Records an output file that may not exist yet (canonicalises its directory instead).
    fn allow_new_output(&self, path: &Path) -> Result<String, String> {
        let file_name = path.file_name().ok_or("Output path has no file name")?;
        let parent = path.parent().filter(|p| !p.as_os_str().is_empty()).ok_or("Output path has no folder")?;
        let canon_parent = simplify(
            parent
                .canonicalize()
                .map_err(|e| format!("Cannot access {}: {e}", parent.display()))?,
        );
        let full = canon_parent.join(file_name);
        self.0
            .lock()
            .map_err(|_| "internal state error".to_string())?
            .insert(full.clone());
        Ok(full.to_string_lossy().into_owned())
    }

    /// Accepts `requested` only if it is exactly a path previously handed out by a picker.
    fn check_existing(&self, requested: &str) -> Result<PathBuf, String> {
        let canon = simplify(
            Path::new(requested)
                .canonicalize()
                .map_err(|_| "File not found".to_string())?,
        );
        let allowed = self.0.lock().map_err(|_| "internal state error".to_string())?;
        if allowed.contains(&canon) {
            Ok(canon)
        } else {
            Err("That file was not selected through the file picker.".to_string())
        }
    }

    fn check_output(&self, requested: &str) -> Result<PathBuf, String> {
        let path = PathBuf::from(requested);
        let file_name = path.file_name().ok_or("Invalid output path")?;
        let parent = path.parent().ok_or("Invalid output path")?;
        let canon_parent = simplify(parent.canonicalize().map_err(|_| "Output folder not found".to_string())?);
        let full = canon_parent.join(file_name);
        let allowed = self.0.lock().map_err(|_| "internal state error".to_string())?;
        if allowed.contains(&full) {
            Ok(full)
        } else {
            Err("That output location was not chosen through the save dialog.".to_string())
        }
    }
}

#[derive(Serialize)]
pub struct EngineInfo {
    pub app_version: String,
    pub os: String,
    pub arch: String,
    /// First line of `ffmpeg -version`, or None if the bundled sidecar cannot run.
    pub ffmpeg: Option<String>,
}

#[tauri::command]
pub async fn engine_info(app: AppHandle) -> Result<EngineInfo, String> {
    let ffmpeg = match app.shell().sidecar("ffmpeg") {
        Ok(cmd) => match cmd.args(["-version"]).output().await {
            Ok(out) if out.status.success() => String::from_utf8_lossy(&out.stdout).lines().next().map(|s| s.to_string()),
            _ => None,
        },
        Err(_) => None,
    };
    Ok(EngineInfo {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        ffmpeg,
    })
}

/// Opens the native "select media" dialog and returns the chosen paths (now allowed for probe/transcode).
#[tauri::command]
pub async fn pick_media_files(app: AppHandle, allowed: State<'_, AllowedPaths>) -> Result<Vec<String>, String> {
    let picked = app
        .dialog()
        .file()
        .add_filter(
            "Media",
            &[
                "mp4", "mov", "m4v", "mkv", "webm", "avi", "mp3", "wav", "aac", "m4a", "flac", "png", "jpg", "jpeg", "webp",
            ],
        )
        .blocking_pick_files();

    let mut out = Vec::new();
    for file in picked.unwrap_or_default() {
        let path = file.into_path().map_err(|e| e.to_string())?;
        out.push(allowed.allow_existing(&path)?);
    }
    Ok(out)
}

/// Runs the bundled `ffprobe` on a previously picked file and returns its JSON report (format + streams).
#[tauri::command]
pub async fn probe_media(
    app: AppHandle,
    allowed: State<'_, AllowedPaths>,
    path: String,
) -> Result<serde_json::Value, String> {
    let file = allowed.check_existing(&path)?;
    let output = app
        .shell()
        .sidecar("ffprobe")
        .map_err(|e| format!("ffprobe is not available: {e}"))?
        .args(["-v", "error", "-print_format", "json", "-show_format", "-show_streams"])
        .arg(&file)
        .output()
        .await
        .map_err(|e| format!("ffprobe failed to start: {e}"))?;

    if !output.status.success() {
        return Err(format!("ffprobe could not read this file: {}", String::from_utf8_lossy(&output.stderr).trim()));
    }
    serde_json::from_slice(&output.stdout).map_err(|e| format!("Unexpected ffprobe output: {e}"))
}

/// Opens the native "save as" dialog and returns the chosen output path (now allowed for `transcode_media`).
#[tauri::command]
pub async fn pick_export_path(
    app: AppHandle,
    allowed: State<'_, AllowedPaths>,
    suggested_name: Option<String>,
) -> Result<Option<String>, String> {
    // Only a bare file name is honoured as a suggestion; never a path.
    let name = suggested_name
        .filter(|n| !n.contains(['/', '\\']) && n.len() <= 120 && !n.is_empty())
        .unwrap_or_else(|| "180-export.mp4".to_string());

    let picked = app
        .dialog()
        .file()
        .set_file_name(&name)
        .add_filter("MP4 video", &["mp4"])
        .blocking_save_file();

    match picked {
        Some(file) => {
            let path = file.into_path().map_err(|e| e.to_string())?;
            Ok(Some(allowed.allow_new_output(&path)?))
        }
        None => Ok(None),
    }
}

/// Re-encodes a picked file to H.264/AAC MP4 at a fixed, validated preset.
/// (A whole-timeline render is a separate, later piece of work; this is the safe primitive it will be built on.)
#[tauri::command]
pub async fn transcode_media(
    app: AppHandle,
    allowed: State<'_, AllowedPaths>,
    input_path: String,
    output_path: String,
    preset: String,
) -> Result<String, String> {
    let input = allowed.check_existing(&input_path)?;
    let output = allowed.check_output(&output_path)?;
    if input == output {
        return Err("Output must be a different file from the input.".to_string());
    }

    // (video filter, label). The caller can only choose one of these, never pass raw arguments.
    let scale: Option<&str> = match preset.as_str() {
        "source" => None,
        "1080p" => Some("scale=-2:'min(1080,ih)'"),
        "720p" => Some("scale=-2:'min(720,ih)'"),
        _ => return Err("Unknown export preset".to_string()),
    };

    let mut cmd = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("ffmpeg is not available: {e}"))?
        .args(["-y", "-hide_banner", "-loglevel", "error", "-i"])
        .arg(&input);
    if let Some(vf) = scale {
        cmd = cmd.args(["-vf", vf]);
    }
    let result = cmd
        .args([
            "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
            "-movflags", "+faststart",
        ])
        .arg(&output)
        .output()
        .await
        .map_err(|e| format!("ffmpeg failed to start: {e}"))?;

    if !result.status.success() {
        return Err(format!("Export failed: {}", String::from_utf8_lossy(&result.stderr).trim()));
    }
    Ok(output.to_string_lossy().into_owned())
}
