//! Timeline rendering with the bundled FFmpeg.
//!
//! The web app builds a filter graph from the editor's timeline (apps/frontend/.../services/native-render-plan.ts).
//! This module never trusts it: the graph must pass an ALLOWLIST (`validate_filter_graph`, a line-for-line port of the
//! TypeScript `validateFilterGraph`, which is unit-tested and also run against real FFmpeg), every input must be a file
//! the user picked, the output must be a location chosen in the save dialog, and the FFmpeg command line is assembled
//! here, so the caller can only choose the graph, the size/fps and one of three quality presets.
//!
//! Keep `ALLOWED_FILTERS`, the character set and the test cases in sync with
//! apps/frontend/app/(platform)/(media-editor-app)/media-editor/services/native-render-validate.ts.

use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
    time::{SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

use crate::media::AllowedPaths;

const ALLOWED_FILTERS: &[&str] = &[
    "color", "trim", "atrim", "setpts", "asetpts", "scale", "setsar", "format", "aformat", "overlay", "loop",
    "colorchannelmixer", "fps", "atempo", "volume", "adelay", "afade", "amix", "anullsrc", "aresample", "null", "anull",
    // photos + effect track (none of these read files); keep in sync with native-render-validate.ts
    "crop", "split", "zoompan", "hue", "vignette", "fade",
    // transitions (geq only evaluates expressions over pixels; no file access)
    "geq", "gblur", "rgbashift", "noise",
];
const MAX_GRAPH_LEN: usize = 100_000;
const MAX_FINISHED_JOBS: usize = 20;
const MAX_RUNNING_JOBS: usize = 2;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderSpec {
    pub version: u32,
    pub inputs: Vec<String>,
    pub filter_complex: String,
    pub maps: Vec<String>,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub duration_sec: f64,
    pub quality: String,
    pub has_audio: bool,
    /// Caption/title overlay list written by `write_caption_overlays` (an ffconcat image sequence). When present it is
    /// the LAST input, `[<inputs.len()>:v]` in the graph, and is opened with the concat demuxer in safe mode.
    #[serde(default)]
    pub overlay_sequence: Option<String>,
}

// ── validation ────────────────────────────────────────────────────────────────

fn graph_char_ok(c: char) -> bool {
    c.is_ascii_alphanumeric() || " []=:;,.'()+-*/_%|<>~@!&?^".contains(c)
}

/// Splits on `sep` outside single quotes and outside [labels].
fn split_top_level(s: &str, sep: char) -> Result<Vec<&str>, String> {
    let mut parts = Vec::new();
    let mut start = 0usize;
    let mut in_quote = false;
    let mut bracket: i32 = 0;
    for (i, c) in s.char_indices() {
        if c == '\'' {
            in_quote = !in_quote;
        } else if !in_quote && c == '[' {
            bracket += 1;
        } else if !in_quote && c == ']' {
            bracket -= 1;
        } else if !in_quote && bracket == 0 && c == sep {
            parts.push(&s[start..i]);
            start = i + c.len_utf8();
        }
        if bracket < 0 {
            return Err("unbalanced brackets".to_string());
        }
    }
    if in_quote {
        return Err("unbalanced quotes".to_string());
    }
    if bracket != 0 {
        return Err("unbalanced brackets".to_string());
    }
    parts.push(&s[start..]);
    Ok(parts)
}

fn check_label(label: &str, input_count: usize) -> Result<(), String> {
    if label.contains(':') {
        let (num, kind) = label.split_once(':').unwrap_or(("", ""));
        if !num.is_empty() && num.chars().all(|c| c.is_ascii_digit()) && (kind == "v" || kind == "a") {
            let idx: usize = num.parse().map_err(|_| format!("invalid label [{label}]"))?;
            return if idx < input_count { Ok(()) } else { Err(format!("input label [{label}] is out of range")) };
        }
        return Err(format!("invalid label [{label}]"));
    }
    if (1..=32).contains(&label.len()) && label.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
        Ok(())
    } else {
        Err(format!("invalid label [{label}]"))
    }
}

pub fn validate_filter_graph(graph: &str, input_count: usize) -> Result<(), String> {
    if graph.is_empty() || graph.len() > MAX_GRAPH_LEN {
        return Err("filter graph has an invalid length".to_string());
    }
    if !graph.chars().all(graph_char_ok) {
        return Err("filter graph contains a character that is not allowed".to_string());
    }

    for chain in split_top_level(graph, ';')? {
        for raw in split_top_level(chain, ',')? {
            let mut token = raw.trim();
            while token.starts_with('[') {
                let end = token.find(']').ok_or("unterminated label")?;
                check_label(&token[1..end], input_count)?;
                token = &token[end + 1..];
            }
            while token.ends_with(']') {
                let start = token.rfind('[').ok_or("unterminated label")?;
                check_label(&token[start + 1..token.len() - 1], input_count)?;
                token = &token[..start];
            }
            let token = token.trim();
            let name = token.split('=').next().unwrap_or("").trim();
            if !ALLOWED_FILTERS.contains(&name) {
                return Err(format!("filter \"{name}\" is not allowed"));
            }
            if token.contains('[') || token.contains(']') {
                return Err("unexpected label inside filter arguments".to_string());
            }
        }
    }
    Ok(())
}

pub fn validate_spec(spec: &RenderSpec) -> Result<(), String> {
    if spec.version != 1 {
        return Err("unsupported spec version".to_string());
    }
    if spec.inputs.is_empty() || spec.inputs.len() > 64 {
        return Err("invalid input count".to_string());
    }
    if !(16..=8192).contains(&spec.width) || !(16..=8192).contains(&spec.height) {
        return Err("invalid size".to_string());
    }
    if !(1..=120).contains(&spec.fps) {
        return Err("invalid fps".to_string());
    }
    if !(spec.duration_sec >= 0.1 && spec.duration_sec <= 86_400.0) {
        return Err("invalid duration".to_string());
    }
    if !["draft", "balanced", "high"].contains(&spec.quality.as_str()) {
        return Err("invalid quality".to_string());
    }
    let expected: &[&str] = if spec.has_audio { &["[vout]", "[aout]"] } else { &["[vout]"] };
    if spec.maps.len() != expected.len() || spec.maps.iter().zip(expected).any(|(a, b)| a != b) {
        return Err("invalid output maps".to_string());
    }
    if let Some(p) = &spec.overlay_sequence {
        if !p.ends_with("list.ffconcat") || p.len() > 4096 {
            return Err("invalid overlay sequence".to_string());
        }
    }
    let input_count = spec.inputs.len() + usize::from(spec.overlay_sequence.is_some());
    validate_filter_graph(&spec.filter_complex, input_count)
}

// ── command line ──────────────────────────────────────────────────────────────

/// Mirrors `renderSpec` in tests/integration/native-render-plan.integration.ts, which is run against real FFmpeg.
pub fn build_args(spec: &RenderSpec, inputs: &[PathBuf], overlay_list: Option<&Path>, output: &Path) -> Vec<String> {
    let mut a: Vec<String> = ["-y", "-hide_banner", "-loglevel", "error", "-nostats", "-progress", "pipe:1"]
        .iter()
        .map(|s| s.to_string())
        .collect();
    for p in inputs {
        a.push("-i".into());
        a.push(p.to_string_lossy().into_owned());
    }
    if let Some(list) = overlay_list {
        // safe mode: the list may only name plain relative files (it only ever contains f00000.png-style names)
        for s in ["-f", "concat", "-safe", "1", "-i"] {
            a.push(s.into());
        }
        a.push(list.to_string_lossy().into_owned());
    }
    a.push("-filter_complex".into());
    a.push(spec.filter_complex.clone());
    for m in &spec.maps {
        a.push("-map".into());
        a.push(m.clone());
    }
    let (preset, crf) = match spec.quality.as_str() {
        "draft" => ("veryfast", "26"),
        "high" => ("slow", "17"),
        _ => ("medium", "20"),
    };
    for s in ["-c:v", "libx264", "-preset", preset, "-crf", crf, "-pix_fmt", "yuv420p"] {
        a.push(s.into());
    }
    if spec.has_audio {
        for s in ["-c:a", "aac", "-b:a", "192k"] {
            a.push(s.into());
        }
    }
    a.push("-t".into());
    a.push(format!("{:.3}", spec.duration_sec));
    a.push("-movflags".into());
    a.push("+faststart".into());
    a.push(output.to_string_lossy().into_owned());
    a
}

/// `out_time_us=1234567` (FFmpeg >= 4.4) or `out_time_ms=1234567` (older builds; the value is microseconds there too).
pub fn parse_progress_seconds(line: &str) -> Option<f64> {
    let v = line.strip_prefix("out_time_us=").or_else(|| line.strip_prefix("out_time_ms="))?;
    let micros: i64 = v.trim().parse().ok()?;
    if micros < 0 {
        return None;
    }
    Some(micros as f64 / 1_000_000.0)
}

// ── jobs ──────────────────────────────────────────────────────────────────────

#[derive(Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum JobState {
    Running,
    Done,
    Failed,
    Cancelled,
}

struct Job {
    state: JobState,
    progress: f64,
    error: Option<String>,
    output: Option<String>,
    child: Option<CommandChild>,
    started: u64,
}

#[derive(Default)]
pub struct RenderJobs(Mutex<HashMap<String, Job>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RenderStatus {
    pub state: JobState,
    pub progress: f64,
    pub error: Option<String>,
    pub output: Option<String>,
}

static JOB_COUNTER: AtomicU64 = AtomicU64::new(1);

fn now_millis() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

fn with_job<F: FnOnce(&mut Job)>(jobs: &RenderJobs, id: &str, f: F) {
    if let Ok(mut map) = jobs.0.lock() {
        if let Some(job) = map.get_mut(id) {
            f(job);
        }
    }
}

fn prune_finished(map: &mut HashMap<String, Job>) {
    let mut finished: Vec<(String, u64)> = map
        .iter()
        .filter(|(_, j)| j.state != JobState::Running)
        .map(|(k, j)| (k.clone(), j.started))
        .collect();
    if finished.len() > MAX_FINISHED_JOBS {
        finished.sort_by_key(|(_, started)| *started);
        for (id, _) in finished.iter().take(finished.len() - MAX_FINISHED_JOBS) {
            map.remove(id);
        }
    }
}

/// Validates and starts a render. Returns a job id to poll with `render_status`.
#[tauri::command]
pub async fn render_timeline(
    app: AppHandle,
    allowed: State<'_, AllowedPaths>,
    jobs: State<'_, RenderJobs>,
    spec: RenderSpec,
    output_path: String,
) -> Result<String, String> {
    validate_spec(&spec).map_err(|e| format!("Render rejected: {e}"))?;

    let mut inputs = Vec::with_capacity(spec.inputs.len());
    for p in &spec.inputs {
        inputs.push(allowed.check_existing(p)?);
    }
    let overlay_list = match &spec.overlay_sequence {
        Some(p) => Some(crate::overlays::check_overlay_list(&app, p)?),
        None => None,
    };
    let output = allowed.check_output(&output_path)?;
    if inputs.iter().any(|p| p == &output) {
        return Err("Output must be a different file from every input.".to_string());
    }

    let job_id = format!("r{}-{}", now_millis(), JOB_COUNTER.fetch_add(1, Ordering::Relaxed));
    {
        let mut map = jobs.0.lock().map_err(|_| "internal state error".to_string())?;
        if map.values().filter(|j| j.state == JobState::Running).count() >= MAX_RUNNING_JOBS {
            return Err("Too many exports are already running. Wait for one to finish.".to_string());
        }
    }

    let args = build_args(&spec, &inputs, overlay_list.as_deref(), &output);
    let (mut rx, child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("ffmpeg is not available: {e}"))?
        .args(args)
        .spawn()
        .map_err(|e| format!("ffmpeg failed to start: {e}"))?;

    {
        let mut map = jobs.0.lock().map_err(|_| "internal state error".to_string())?;
        prune_finished(&mut map);
        map.insert(
            job_id.clone(),
            Job { state: JobState::Running, progress: 0.0, error: None, output: None, child: Some(child), started: now_millis() },
        );
    }

    let app2 = app.clone();
    let id2 = job_id.clone();
    let duration = spec.duration_sec;
    let output_str = output.to_string_lossy().into_owned();
    tauri::async_runtime::spawn(async move {
        let mut stderr_tail = String::new();
        while let Some(event) = rx.recv().await {
            let jobs = app2.state::<RenderJobs>();
            match event {
                CommandEvent::Stdout(bytes) => {
                    let line = String::from_utf8_lossy(&bytes);
                    for l in line.lines() {
                        if let Some(secs) = parse_progress_seconds(l) {
                            let p = (secs / duration).clamp(0.0, 0.99);
                            with_job(&jobs, &id2, |j| {
                                if j.state == JobState::Running && p > j.progress {
                                    j.progress = p;
                                }
                            });
                        }
                    }
                }
                CommandEvent::Stderr(bytes) => {
                    stderr_tail.push_str(&String::from_utf8_lossy(&bytes));
                    stderr_tail.push('\n');
                    if stderr_tail.len() > 2000 {
                        let cut = stderr_tail.len() - 2000;
                        stderr_tail = stderr_tail[cut..].to_string();
                    }
                }
                CommandEvent::Error(e) => {
                    stderr_tail.push_str(&e);
                }
                CommandEvent::Terminated(payload) => {
                    let mut cancelled = false;
                    with_job(&jobs, &id2, |j| cancelled = j.state == JobState::Cancelled);
                    if cancelled {
                        let _ = std::fs::remove_file(&output_str);
                    } else if payload.code == Some(0) {
                        // Let the web content preview the finished file through the asset protocol.
                        let _ = app2.asset_protocol_scope().allow_file(&output_str);
                        with_job(&jobs, &id2, |j| {
                            j.state = JobState::Done;
                            j.progress = 1.0;
                            j.output = Some(output_str.clone());
                            j.child = None;
                        });
                    } else {
                        let _ = std::fs::remove_file(&output_str); // never leave a half-written video behind
                        let message = if stderr_tail.trim().is_empty() {
                            format!("ffmpeg exited with code {:?}", payload.code)
                        } else {
                            stderr_tail.trim().to_string()
                        };
                        with_job(&jobs, &id2, |j| {
                            j.state = JobState::Failed;
                            j.error = Some(message.clone());
                            j.child = None;
                        });
                    }
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(job_id)
}

#[tauri::command]
pub fn render_status(jobs: State<'_, RenderJobs>, job_id: String) -> Result<RenderStatus, String> {
    let map = jobs.0.lock().map_err(|_| "internal state error".to_string())?;
    let job = map.get(&job_id).ok_or("Unknown render job")?;
    Ok(RenderStatus { state: job.state, progress: job.progress, error: job.error.clone(), output: job.output.clone() })
}

#[tauri::command]
pub fn cancel_render(jobs: State<'_, RenderJobs>, job_id: String) -> Result<(), String> {
    let child = {
        let mut map = jobs.0.lock().map_err(|_| "internal state error".to_string())?;
        let job = map.get_mut(&job_id).ok_or("Unknown render job")?;
        if job.state != JobState::Running {
            return Ok(());
        }
        job.state = JobState::Cancelled;
        job.child.take()
    };
    if let Some(child) = child {
        child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE: &str = include_str!("../tests/fixtures/sample-spec.json");

    fn spec() -> RenderSpec {
        serde_json::from_str(FIXTURE).expect("fixture parses")
    }

    #[test]
    fn a_real_plan_produced_by_the_typescript_builder_is_accepted() {
        // The fixture is generated from buildNativeRenderPlan(); if the builder starts emitting something the
        // native side would reject, this fails.
        validate_spec(&spec()).expect("builder output must pass the native validator");
    }

    #[test]
    fn a_plan_with_photos_effects_and_transitions_is_accepted() {
        // Generated by buildNativeRenderPlan() for a project with a cover photo and all six effect types
        // (flash, fade_black, shake, zoom_pulse, black_white, vignette) plus WIPE / GLITCH / BLUR_PUNCH transitions;
        // every effect and transition type is rendered against real FFmpeg in
        // apps/frontend/tests/integration/native-render-plan.integration.ts.
        let s: RenderSpec = serde_json::from_str(include_str!("../tests/fixtures/effects-spec.json")).expect("fixture parses");
        validate_spec(&s).expect("effect-track output must pass the native validator");
        for f in ["split=2", "zoompan=", "crop=", "hue=", "vignette=", "fade=", "geq=", "gblur=", "rgbashift=", "noise="] {
            assert!(s.filter_complex.contains(f), "fixture should exercise {f}");
        }
    }

    #[test]
    fn hostile_graphs_are_rejected() {
        for graph in [
            "movie=/etc/passwd[x]",
            "amovie=C:/secret.wav[x]",
            "[0:v]subtitles=/etc/passwd[o]",
            "[0:v]drawtext=textfile=/etc/passwd[o]",
            "[0:v]sendcmd=f=/x[o]",
            "[0:v]lut3d=/x[o]",
            "[0:v]hackfilter=1[o]",
            "[0:v]scale=w=2:h=2,movie=/x[o]",
            "[0:v]scale=w=2:h=2[a];movie=/x[o]",
            "[5:v]scale=w=2:h=2[o]",
            "[0:v]scale=w=2:h=2[o;x]",
            "[0:v]scale=[x]=2[o]",
            "[0:v]scale=w=2\\:h=2[o]",
            "[0:v]scale=w=\"2\":h=2[o]",
            "[0:v]scale=w=`id`:h=2[o]",
            "[0:v]scale=w=$HOME:h=2[o]",
            "[0:v]scale=w=2:h=2[o]\nmovie=/x[y]",
            "[0:v]overlay=enable='between(t,0,4)[o]",
            "[0:v]scale=w=2:h=2[o",
            "",
        ] {
            assert!(validate_filter_graph(graph, 1).is_err(), "should reject: {graph:?}");
        }
        assert!(validate_filter_graph(&"null,".repeat(30_000), 1).is_err());
    }

    #[test]
    fn legitimate_graph_is_accepted() {
        let good = "color=c=black:s=1920x1080:r=30:d=4[base0];[0:v]trim=start=0:duration=4,setpts=(PTS-STARTPTS)/1+0/TB[v0];[base0][v0]overlay=x='(main_w-overlay_w)/2':y='0':enable='between(t,0,4)'[o]";
        assert!(validate_filter_graph(good, 1).is_ok());
    }

    #[test]
    fn spec_fields_are_bounded() {
        let mut s = spec();
        s.version = 2;
        assert!(validate_spec(&s).is_err());
        let mut s = spec();
        s.inputs.clear();
        assert!(validate_spec(&s).is_err());
        let mut s = spec();
        s.width = 100_000;
        assert!(validate_spec(&s).is_err());
        let mut s = spec();
        s.fps = 0;
        assert!(validate_spec(&s).is_err());
        let mut s = spec();
        s.duration_sec = -1.0;
        assert!(validate_spec(&s).is_err());
        let mut s = spec();
        s.quality = "ultra".into();
        assert!(validate_spec(&s).is_err());
        let mut s = spec();
        s.maps = vec!["[vout]".into(), "[evil]".into()];
        assert!(validate_spec(&s).is_err());
    }

    #[test]
    fn command_line_has_the_tested_shape() {
        let s = spec();
        let inputs: Vec<PathBuf> = s.inputs.iter().map(PathBuf::from).collect();
        let args = build_args(&s, &inputs, None, Path::new("/out/final.mp4"));
        assert_eq!(&args[..5], ["-y", "-hide_banner", "-loglevel", "error", "-nostats"]);
        assert!(args.windows(2).any(|w| w[0] == "-filter_complex" && w[1] == s.filter_complex));
        assert_eq!(args.iter().filter(|a| *a == "-i").count(), s.inputs.len());
        assert!(args.windows(2).any(|w| w[0] == "-t"));
        assert_eq!(args.last().map(String::as_str), Some("/out/final.mp4"));
        // never anything the caller controls except the graph, size/fps and quality
        assert!(!args.iter().any(|a| a == "-f" || a == "-vf" || a == "-af"));
    }

    #[test]
    fn caption_overlay_list_is_the_last_input_opened_with_the_concat_demuxer() {
        let mut s = spec();
        let inputs: Vec<PathBuf> = s.inputs.iter().map(PathBuf::from).collect();
        let n = s.inputs.len();
        s.overlay_sequence = Some("/cache/render-overlays/o1-1/list.ffconcat".to_string());
        s.filter_complex = format!("{};[base9][{n}:v]overlay=x=0:y=0:eof_action=repeat[cap]", s.filter_complex);
        validate_spec(&s).expect("overlay input index is in range");
        let args = build_args(&s, &inputs, Some(Path::new("/cache/render-overlays/o1-1/list.ffconcat")), Path::new("/out/final.mp4"));
        let i = args.iter().position(|a| a == "concat").expect("concat demuxer");
        assert_eq!(&args[i - 1..i + 5], ["-f", "concat", "-safe", "1", "-i", "/cache/render-overlays/o1-1/list.ffconcat"]);
        assert_eq!(args.iter().filter(|a| *a == "-i").count(), n + 1);
        // without the overlay list, the extra input index is out of range
        s.overlay_sequence = None;
        assert!(validate_spec(&s).is_err());
        s.overlay_sequence = Some("/etc/passwd".to_string());
        assert!(validate_spec(&s).is_err());
    }

    #[test]
    fn progress_lines_parse_in_both_ffmpeg_dialects() {
        assert_eq!(parse_progress_seconds("out_time_us=2500000"), Some(2.5));
        assert_eq!(parse_progress_seconds("out_time_ms=2500000"), Some(2.5));
        assert_eq!(parse_progress_seconds("out_time_us=-9223372036854775807"), None);
        assert_eq!(parse_progress_seconds("frame=12"), None);
        assert_eq!(parse_progress_seconds("out_time_us=N/A"), None);
    }
}
