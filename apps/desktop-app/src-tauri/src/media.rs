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
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::ShellExt;

/// Paths the user selected through a native dialog (canonicalised). Field 0 is everything allowed in this session;
/// field 1 is the subset of INPUT files that is remembered across restarts (see `load_remembered`), so a project that
/// is reopened later can still read its media. Output paths are never remembered.
#[derive(Default)]
pub struct AllowedPaths(Mutex<HashSet<PathBuf>>, Mutex<Vec<PathBuf>>);

const REMEMBER_FILE: &str = "allowed-media.json";
const REMEMBER_MAX: usize = 5000;

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
        {
            let mut remembered = self.1.lock().map_err(|_| "internal state error".to_string())?;
            if !remembered.contains(&canon) {
                remembered.push(canon.clone());
                if remembered.len() > REMEMBER_MAX {
                    let excess = remembered.len() - REMEMBER_MAX;
                    remembered.drain(..excess); // forget the oldest
                }
            }
        }
        Ok(canon.to_string_lossy().into_owned())
    }

    /// Allows a file the app itself created in its cache (downloaded stock media) for this session only; it is never
    /// added to the remembered list.
    pub(crate) fn allow_session_file(&self, path: &Path) -> Result<String, String> {
        let canon = simplify(path.canonicalize().map_err(|e| format!("Cannot access {}: {e}", path.display()))?);
        self.0.lock().map_err(|_| "internal state error".to_string())?.insert(canon.clone());
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
    pub(crate) fn check_existing(&self, requested: &str) -> Result<PathBuf, String> {
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

    pub(crate) fn check_output(&self, requested: &str) -> Result<PathBuf, String> {
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

/// Writes the remembered input list to the app data folder. Best effort: a failure only means the files have to be
/// re-picked after the next restart.
fn save_remembered(app: &AppHandle, allowed: &AllowedPaths) {
    let Ok(dir) = app.path().app_data_dir() else { return };
    let list: Vec<String> = match allowed.1.lock() {
        Ok(r) => r.iter().map(|p| p.to_string_lossy().into_owned()).collect(),
        Err(_) => return,
    };
    if std::fs::create_dir_all(&dir).is_err() {
        return;
    }
    if let Ok(json) = serde_json::to_string(&list) {
        let _ = std::fs::write(dir.join(REMEMBER_FILE), json);
    }
}

/// Called once at startup: re-allows (for probing/rendering AND for playback through the asset protocol) the media the
/// user picked in earlier sessions, but only files that still exist. The list lives in the app's private data folder and
/// only ever gains entries through the native file picker.
pub fn load_remembered(app: &AppHandle, allowed: &AllowedPaths) {
    let Ok(dir) = app.path().app_data_dir() else { return };
    let Ok(text) = std::fs::read_to_string(dir.join(REMEMBER_FILE)) else { return };
    let Ok(list) = serde_json::from_str::<Vec<String>>(&text) else { return };
    for entry in list.into_iter().take(REMEMBER_MAX) {
        let path = PathBuf::from(&entry);
        if !path.is_file() {
            continue;
        }
        if let Ok(canon) = path.canonicalize() {
            let canon = simplify(canon);
            if let Ok(mut set) = allowed.0.lock() {
                set.insert(canon.clone());
            }
            if let Ok(mut remembered) = allowed.1.lock() {
                if !remembered.contains(&canon) {
                    remembered.push(canon.clone());
                }
            }
            let _ = app.asset_protocol_scope().allow_file(&canon);
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
        let canonical = allowed.allow_existing(&path)?;
        // Playback/preview in the editor goes through the asset protocol, scoped at runtime to exactly the files the
        // user picked (tauri.conf.json starts with an empty scope).
        let _ = app.asset_protocol_scope().allow_file(&canonical);
        out.push(canonical);
    }
    save_remembered(&app, &allowed);
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

// ---------------------------------------------------------------------------------------------
// Speech analysis for the AI Director. Runs locally; only 16 kHz mono speech audio leaves the device,
// to the platform's own /media-editor/transcribe endpoint.
// ---------------------------------------------------------------------------------------------

/// Max audio sent for transcription (matches the server's upload limit).
const MAX_TRANSCRIPTION_AUDIO_BYTES: usize = 25 * 1024 * 1024;

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SilenceRange {
    pub start_ms: u64,
    pub end_ms: u64,
}

fn parse_secs_after(line: &str, key: &str) -> Option<f64> {
    let rest = &line[line.find(key)? + key.len()..];
    rest.trim_start().split(|c: char| c.is_whitespace() || c == '|').next()?.parse::<f64>().ok()
}

/// `Duration: HH:MM:SS.xx` from ffmpeg's input banner, in ms.
pub(crate) fn parse_duration_ms(stderr: &str) -> Option<u64> {
    let line = stderr.lines().find(|l| l.trim_start().starts_with("Duration:"))?;
    let hms = line.trim_start().trim_start_matches("Duration:").trim().split(',').next()?.trim();
    let mut parts = hms.split(':');
    let h = parts.next()?.parse::<f64>().ok()?;
    let m = parts.next()?.parse::<f64>().ok()?;
    let s = parts.next()?.parse::<f64>().ok()?;
    Some(((h * 3600.0 + m * 60.0 + s) * 1000.0).round() as u64)
}

/// Parses `silencedetect` output. A trailing `silence_start` with no end (silence running to EOF) is closed at
/// the media duration so end-of-file dead air is not lost.
pub(crate) fn parse_silences(stderr: &str, duration_ms: Option<u64>) -> Vec<SilenceRange> {
    let mut out = Vec::new();
    let mut open: Option<u64> = None;
    for line in stderr.lines() {
        if line.contains("silence_start:") {
            open = parse_secs_after(line, "silence_start:").map(|s| (s.max(0.0) * 1000.0).round() as u64);
        } else if line.contains("silence_end:") {
            if let (Some(start), Some(end)) = (open.take(), parse_secs_after(line, "silence_end:")) {
                let end_ms = (end * 1000.0).round() as u64;
                if end_ms > start {
                    out.push(SilenceRange { start_ms: start, end_ms });
                }
            }
        }
    }
    if let (Some(start), Some(dur)) = (open, duration_ms) {
        if dur > start {
            out.push(SilenceRange { start_ms: start, end_ms: dur });
        }
    }
    out
}

fn no_audio(stderr: &str) -> bool {
    stderr.contains("does not contain any stream") || stderr.contains("matches no streams") || stderr.contains("Output file is empty")
}

/// Pauses in a picked file's audio (ffmpeg `silencedetect`). A file without audio returns an empty list.
#[tauri::command]
pub async fn detect_silences(
    app: AppHandle,
    allowed: State<'_, AllowedPaths>,
    path: String,
    min_silence_ms: Option<u32>,
    threshold_db: Option<f32>,
) -> Result<Vec<SilenceRange>, String> {
    let file = allowed.check_existing(&path)?;
    let min_ms = min_silence_ms.unwrap_or(500).clamp(100, 5000);
    let noise = threshold_db.unwrap_or(-40.0).clamp(-80.0, -10.0);
    let filter = format!("silencedetect=noise={noise}dB:d={:.3}", min_ms as f64 / 1000.0);
    let result = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("ffmpeg is not available: {e}"))?
        .args(["-hide_banner", "-nostats", "-i"])
        .arg(&file)
        .args(["-vn", "-af", filter.as_str(), "-f", "null", "-"])
        .output()
        .await
        .map_err(|e| format!("ffmpeg failed to start: {e}"))?;
    let stderr = String::from_utf8_lossy(&result.stderr).to_string();
    if !result.status.success() {
        if no_audio(&stderr) {
            return Ok(Vec::new());
        }
        return Err(format!("Silence detection failed: {}", stderr.lines().last().unwrap_or("").trim()));
    }
    Ok(parse_silences(&stderr, parse_duration_ms(&stderr)))
}

/// Speech audio (16 kHz mono AAC in M4A) for transcription, returned as raw bytes; the temp file is deleted.
#[tauri::command]
pub async fn extract_audio_for_transcription(
    app: AppHandle,
    allowed: State<'_, AllowedPaths>,
    path: String,
) -> Result<tauri::ipc::Response, String> {
    let file = allowed.check_existing(&path)?;
    let dir = app.path().app_cache_dir().map_err(|e| format!("No cache directory: {e}"))?.join("stt");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Cannot create cache directory: {e}"))?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let out = dir.join(format!("stt_{stamp}.m4a"));
    let result = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("ffmpeg is not available: {e}"))?
        .args(["-y", "-hide_banner", "-loglevel", "error", "-i"])
        .arg(&file)
        .args(["-vn", "-ac", "1", "-ar", "16000", "-c:a", "aac", "-b:a", "48k"])
        .arg(&out)
        .output()
        .await
        .map_err(|e| format!("ffmpeg failed to start: {e}"))?;
    let stderr = String::from_utf8_lossy(&result.stderr).to_string();
    if !result.status.success() {
        let _ = std::fs::remove_file(&out);
        if no_audio(&stderr) {
            return Err("NO_AUDIO_TRACK: This video has no audio to transcribe.".to_string());
        }
        return Err(format!("Audio extraction failed: {}", stderr.trim()));
    }
    let bytes = std::fs::read(&out).map_err(|e| format!("Cannot read extracted audio: {e}"));
    let _ = std::fs::remove_file(&out);
    let bytes = bytes?;
    if bytes.len() > MAX_TRANSCRIPTION_AUDIO_BYTES {
        return Err("AUDIO_TOO_LARGE: The audio is over 25 MB (about 70 minutes of speech). Trim the video first.".to_string());
    }
    Ok(tauri::ipc::Response::new(bytes))
}

#[cfg(test)]
mod speech_tests {
    use super::*;

    const SAMPLE: &str = "Input #0, mov,mp4, from 'a.mp4':\n  Duration: 00:00:12.50, start: 0.000000, bitrate: 900 kb/s\n[silencedetect @ 0x1] silence_start: 1.2\n[silencedetect @ 0x1] silence_end: 2.05 | silence_duration: 0.85\n[silencedetect @ 0x1] silence_start: 11.1\n";

    #[test]
    fn parses_ranges_and_flushes_trailing_silence_at_eof() {
        let d = parse_duration_ms(SAMPLE);
        assert_eq!(d, Some(12_500));
        assert_eq!(
            parse_silences(SAMPLE, d),
            vec![SilenceRange { start_ms: 1200, end_ms: 2050 }, SilenceRange { start_ms: 11_100, end_ms: 12_500 }]
        );
    }

    #[test]
    fn no_duration_drops_the_open_range_and_negative_start_clamps() {
        let s = "silence_start: -0.01\nsilence_end: 0.6 | silence_duration: 0.61\nsilence_start: 3.0\n";
        assert_eq!(parse_silences(s, None), vec![SilenceRange { start_ms: 0, end_ms: 600 }]);
    }

    #[test]
    fn detects_missing_audio() {
        assert!(no_audio("Output file #0 does not contain any stream"));
        assert!(!no_audio("frame=  10"));
    }
}
