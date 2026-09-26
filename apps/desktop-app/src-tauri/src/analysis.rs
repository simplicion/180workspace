//! Media intelligence and post-export QA with the bundled FFmpeg (scene cuts, loudness, black/frozen frames).
//!
//! Same security model as media.rs / render.rs: the file must be one the user picked (or an export written to a
//! location chosen in the save dialog), the FFmpeg arguments are fixed here and the caller only picks one of a few
//! analysis kinds plus a bounded scene threshold. Nothing is written to disk (`-f null`).
//!
//! The raw FFmpeg report is returned (only the lines the parsers need, capped) and parsed in TypeScript
//! (apps/frontend/.../media-editor/services/media-analysis.ts), where the parsers are tested against the real bundled
//! FFmpeg. Keep `build_analysis_args` and `keep_line` in sync with `analysisArgs` / `keepAnalysisLine` there.
//!
//! Jobs run in the background like renders: `start_media_analysis` returns an id to poll with `media_analysis_status`,
//! and `cancel_media_analysis` kills the FFmpeg process.

use std::{
    collections::HashMap,
    path::Path,
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
    time::{SystemTime, UNIX_EPOCH},
};

use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

use crate::media::AllowedPaths;
use crate::render::parse_progress_seconds;

const MAX_OUTPUT_BYTES: usize = 1024 * 1024;
const MAX_RUNNING: usize = 3;
const MAX_FINISHED: usize = 30;

/// What to measure. `QaNoFreeze` is the QA pass for FFmpeg builds without the `freezedetect` filter: it measures
/// frozen picture with `mpdecimate` (drops near-duplicate frames) + `showinfo` (times of the frames that remain).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AnalysisKind {
    Scenes,
    Loudness,
    Qa,
    QaNoFreeze,
}

impl AnalysisKind {
    pub fn parse(s: &str) -> Result<Self, String> {
        match s {
            "scenes" => Ok(Self::Scenes),
            "loudness" => Ok(Self::Loudness),
            "qa" => Ok(Self::Qa),
            "qa_nofreeze" => Ok(Self::QaNoFreeze),
            _ => Err("Unknown analysis kind".to_string()),
        }
    }
}

/// Scene-change score threshold (FFmpeg `select` scene score, 0..1). Clamped so a caller cannot make it useless.
pub fn clamp_threshold(t: Option<f64>) -> f64 {
    let v = t.unwrap_or(0.3);
    if v.is_finite() { v.clamp(0.1, 0.9) } else { 0.3 }
}

/// The fixed FFmpeg command line for one analysis. Mirrors `analysisArgs` in media-analysis.ts.
pub fn build_analysis_args(kind: AnalysisKind, input: &Path, scene_threshold: f64) -> Vec<String> {
    let mut a: Vec<String> = ["-hide_banner", "-nostats", "-loglevel", "info", "-progress", "pipe:1", "-i"]
        .iter()
        .map(|s| s.to_string())
        .collect();
    a.push(input.to_string_lossy().into_owned());
    let loud = "ebur128=peak=true:framelog=verbose,astats=metadata=0";
    match kind {
        AnalysisKind::Scenes => {
            a.extend(["-an", "-sn", "-dn", "-vf"].iter().map(|s| s.to_string()));
            a.push(format!("scale=160:-2,select='gt(scene,{scene_threshold:.2})',showinfo"));
        }
        AnalysisKind::Loudness => {
            a.extend(["-vn", "-sn", "-dn", "-af", loud].iter().map(|s| s.to_string()));
        }
        AnalysisKind::Qa | AnalysisKind::QaNoFreeze => {
            let vf = if kind == AnalysisKind::Qa {
                "blackdetect=d=0.1:pix_th=0.10,freezedetect=n=-60dB:d=0.5"
            } else {
                "blackdetect=d=0.1:pix_th=0.10,mpdecimate,showinfo"
            };
            a.extend(["-sn", "-dn", "-vf", vf, "-af", loud].iter().map(|s| s.to_string()));
        }
    }
    a.extend(["-f", "null", "-"].iter().map(|s| s.to_string()));
    a
}

/// Only the report lines the parsers read are kept (the per-frame noise is dropped). Mirrors `keepAnalysisLine`.
pub fn keep_line(line: &str) -> bool {
    const KEYS: &[&str] = &[
        "Duration:", "pts_time:", "black_start:", "freeze_start", "freeze_end", "Integrated loudness", " I:", "True peak",
        "Peak:", "Parsed_astats", "No such filter", "does not contain any stream", "matches no streams", "Stream #0",
        "Error", "Invalid",
    ];
    KEYS.iter().any(|k| line.contains(k))
}

#[derive(Clone, Copy, PartialEq, Eq, Serialize, Debug)]
#[serde(rename_all = "lowercase")]
pub enum AnalysisState {
    Running,
    Done,
    Failed,
    Cancelled,
}

struct Job {
    state: AnalysisState,
    progress: f64,
    error: Option<String>,
    output: String,
    child: Option<CommandChild>,
    started: u64,
}

#[derive(Default)]
pub struct AnalysisJobs(Mutex<HashMap<String, Job>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisStatus {
    pub state: AnalysisState,
    pub progress: f64,
    pub error: Option<String>,
    /// The kept FFmpeg report lines; only set once the job is done.
    pub output: Option<String>,
}

static COUNTER: AtomicU64 = AtomicU64::new(1);

fn now_millis() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

fn with_job<F: FnOnce(&mut Job)>(jobs: &AnalysisJobs, id: &str, f: F) {
    if let Ok(mut map) = jobs.0.lock() {
        if let Some(job) = map.get_mut(id) {
            f(job);
        }
    }
}

fn prune(map: &mut HashMap<String, Job>) {
    let mut finished: Vec<(String, u64)> =
        map.iter().filter(|(_, j)| j.state != AnalysisState::Running).map(|(k, j)| (k.clone(), j.started)).collect();
    if finished.len() > MAX_FINISHED {
        finished.sort_by_key(|(_, s)| *s);
        for (id, _) in finished.iter().take(finished.len() - MAX_FINISHED) {
            map.remove(id);
        }
    }
}

/// Appends the kept lines of `chunk` to `out`, never past `MAX_OUTPUT_BYTES`.
pub fn append_kept(out: &mut String, chunk: &str) {
    for line in chunk.lines() {
        if keep_line(line) && out.len() + line.len() + 1 <= MAX_OUTPUT_BYTES {
            out.push_str(line);
            out.push('\n');
        }
    }
}

/// Starts an analysis of a picked file (or a finished export). `duration_sec` (from a probe) only drives progress.
#[tauri::command]
pub async fn start_media_analysis(
    app: AppHandle,
    allowed: State<'_, AllowedPaths>,
    jobs: State<'_, AnalysisJobs>,
    path: String,
    kind: String,
    scene_threshold: Option<f64>,
    duration_sec: Option<f64>,
) -> Result<String, String> {
    let kind = AnalysisKind::parse(&kind)?;
    // Inputs the user picked, downloaded stock media, and exports written to a save-dialog location are all in the
    // allowed set; nothing else is readable.
    let file = allowed.check_existing(&path).or_else(|_| allowed.check_output(&path))?;
    let args = build_analysis_args(kind, &file, clamp_threshold(scene_threshold));
    {
        let map = jobs.0.lock().map_err(|_| "internal state error".to_string())?;
        if map.values().filter(|j| j.state == AnalysisState::Running).count() >= MAX_RUNNING {
            return Err("Too many analyses are running. Wait for one to finish.".to_string());
        }
    }
    let (mut rx, child) = app
        .shell()
        .sidecar("ffmpeg")
        .map_err(|e| format!("ffmpeg is not available: {e}"))?
        .args(args)
        .spawn()
        .map_err(|e| format!("ffmpeg failed to start: {e}"))?;

    let id = format!("a{}-{}", now_millis(), COUNTER.fetch_add(1, Ordering::Relaxed));
    {
        let mut map = jobs.0.lock().map_err(|_| "internal state error".to_string())?;
        prune(&mut map);
        map.insert(
            id.clone(),
            Job { state: AnalysisState::Running, progress: 0.0, error: None, output: String::new(), child: Some(child), started: now_millis() },
        );
    }

    let app2 = app.clone();
    let id2 = id.clone();
    let duration = duration_sec.filter(|d| d.is_finite() && *d > 0.0);
    tauri::async_runtime::spawn(async move {
        let mut report = String::new();
        while let Some(event) = rx.recv().await {
            let jobs = app2.state::<AnalysisJobs>();
            match event {
                CommandEvent::Stdout(bytes) => {
                    if let Some(d) = duration {
                        for l in String::from_utf8_lossy(&bytes).lines() {
                            if let Some(secs) = parse_progress_seconds(l) {
                                let p = (secs / d).clamp(0.0, 0.99);
                                with_job(&jobs, &id2, |j| {
                                    if j.state == AnalysisState::Running && p > j.progress {
                                        j.progress = p;
                                    }
                                });
                            }
                        }
                    }
                }
                CommandEvent::Stderr(bytes) => append_kept(&mut report, &String::from_utf8_lossy(&bytes)),
                CommandEvent::Error(e) => append_kept(&mut report, &format!("Error: {e}")),
                CommandEvent::Terminated(payload) => {
                    let ok = payload.code == Some(0);
                    // A file without the analysed stream is a valid result (the parsers report "no audio"/"no video").
                    let no_stream = report.contains("does not contain any stream") || report.contains("matches no streams");
                    with_job(&jobs, &id2, |j| {
                        if j.state == AnalysisState::Cancelled {
                            return;
                        }
                        j.child = None;
                        if ok || no_stream {
                            j.state = AnalysisState::Done;
                            j.progress = 1.0;
                            j.output = std::mem::take(&mut report);
                        } else {
                            j.state = AnalysisState::Failed;
                            let tail: Vec<&str> = report.lines().rev().take(3).collect();
                            j.error = Some(if tail.is_empty() {
                                format!("ffmpeg exited with code {:?}", payload.code)
                            } else {
                                tail.into_iter().rev().collect::<Vec<_>>().join("\n")
                            });
                        }
                    });
                    break;
                }
                _ => {}
            }
        }
    });
    Ok(id)
}

#[tauri::command]
pub fn media_analysis_status(jobs: State<'_, AnalysisJobs>, job_id: String) -> Result<AnalysisStatus, String> {
    let map = jobs.0.lock().map_err(|_| "internal state error".to_string())?;
    let job = map.get(&job_id).ok_or("Unknown analysis job")?;
    Ok(AnalysisStatus {
        state: job.state,
        progress: job.progress,
        error: job.error.clone(),
        output: if job.state == AnalysisState::Done { Some(job.output.clone()) } else { None },
    })
}

#[tauri::command]
pub fn cancel_media_analysis(jobs: State<'_, AnalysisJobs>, job_id: String) -> Result<(), String> {
    let child = {
        let mut map = jobs.0.lock().map_err(|_| "internal state error".to_string())?;
        let job = map.get_mut(&job_id).ok_or("Unknown analysis job")?;
        if job.state != AnalysisState::Running {
            return Ok(());
        }
        job.state = AnalysisState::Cancelled;
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

    #[test]
    fn kinds_are_a_closed_set() {
        assert_eq!(AnalysisKind::parse("scenes"), Ok(AnalysisKind::Scenes));
        assert_eq!(AnalysisKind::parse("qa_nofreeze"), Ok(AnalysisKind::QaNoFreeze));
        for bad in ["", "QA", "scenes;rm", "render", "-vf"] {
            assert!(AnalysisKind::parse(bad).is_err(), "{bad}");
        }
    }

    #[test]
    fn threshold_is_clamped_and_formatted() {
        assert_eq!(clamp_threshold(None), 0.3);
        assert_eq!(clamp_threshold(Some(5.0)), 0.9);
        assert_eq!(clamp_threshold(Some(-1.0)), 0.1);
        assert_eq!(clamp_threshold(Some(f64::NAN)), 0.3);
        let args = build_analysis_args(AnalysisKind::Scenes, Path::new("/m/a.mp4"), 0.456);
        assert!(args.contains(&"scale=160:-2,select='gt(scene,0.46)',showinfo".to_string()));
    }

    #[test]
    fn command_lines_have_the_tested_shape() {
        for kind in [AnalysisKind::Scenes, AnalysisKind::Loudness, AnalysisKind::Qa, AnalysisKind::QaNoFreeze] {
            let args = build_analysis_args(kind, Path::new("/m/a.mp4"), 0.3);
            assert_eq!(&args[..7], ["-hide_banner", "-nostats", "-loglevel", "info", "-progress", "pipe:1", "-i"]);
            assert_eq!(args[7], "/m/a.mp4");
            assert_eq!(args.iter().filter(|a| *a == "-i").count(), 1);
            // never writes a file: the null muxer only
            assert_eq!(&args[args.len() - 3..], ["-f", "null", "-"]);
            assert!(!args.iter().any(|a| a == "-y" || a.contains("movie") || a.contains("amovie")));
        }
        let qa = build_analysis_args(AnalysisKind::Qa, Path::new("/m/a.mp4"), 0.3);
        assert!(qa.iter().any(|a| a.contains("freezedetect")));
        let qa2 = build_analysis_args(AnalysisKind::QaNoFreeze, Path::new("/m/a.mp4"), 0.3);
        assert!(!qa2.iter().any(|a| a.contains("freezedetect")));
        assert!(qa2.iter().any(|a| a.contains("blackdetect") && a.contains("mpdecimate,showinfo")));
    }

    #[test]
    fn only_report_lines_are_kept_and_output_is_capped() {
        assert!(keep_line("[Parsed_showinfo_2 @ 0x1] n:   0 pts:  25600 pts_time:2       pos:    19558"));
        assert!(keep_line("    I:         -21.8 LUFS"));
        assert!(keep_line("[blackdetect @ 0x1] black_start:4 black_end:4.96 black_duration:0.96"));
        assert!(keep_line("[freezedetect @ 0x1] lavfi.freezedetect.freeze_start: 0"));
        assert!(keep_line("[Parsed_astats_1 @ 0x1] Peak count: 2"));
        assert!(!keep_line("[Parsed_ebur128_0 @ 0x1] t: 0.1  TARGET:-23 LUFS    M: -120.7"));
        assert!(!keep_line("frame=   50 fps=0.0 q=-0.0"));
        let mut out = String::new();
        let line = "pts_time:1 ".repeat(100);
        for _ in 0..20_000 {
            append_kept(&mut out, &line);
        }
        assert!(out.len() <= MAX_OUTPUT_BYTES);
    }
}
