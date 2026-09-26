//! Caption / title overlay images for native renders.
//!
//! The web app rasterises every distinct caption state (the same canvas drawing code as the preview and the
//! compatibility renderer) into transparent full-frame PNGs. This module writes them into the app's private cache
//! folder together with an FFmpeg `ffconcat` list that holds each PNG for its duration, and the render then overlays
//! that single image sequence. No libass / drawtext (the bundled 2018 FFmpeg has neither reliably, and drawtext can read
//! files), and the web content never names a path: it only gets back the list path this module created, which
//! `render_timeline` re-checks with `check_overlay_list`.
//!
//! Caps: at most `MAX_IMAGES` images of at most `MAX_IMAGE_BYTES` each (`MAX_TOTAL_BYTES` together) and `MAX_STEPS`
//! sequence steps. Sets older than a day are removed on every write; the editor removes its set after each export.

use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::Deserialize;
use tauri::{AppHandle, Manager};

pub const MAX_IMAGES: usize = 3000;
pub const MAX_IMAGE_BYTES: usize = 8 * 1024 * 1024;
pub const MAX_TOTAL_BYTES: usize = 512 * 1024 * 1024;
pub const MAX_STEPS: usize = 20_000;
const DIR_NAME: &str = "render-overlays";
const LIST_NAME: &str = "list.ffconcat";
const STALE_AFTER: Duration = Duration::from_secs(24 * 3600);
const PNG_SIGNATURE: &[u8] = &[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];

static SET_COUNTER: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayStep {
    /// index into `images`
    pub image: u32,
    pub duration_sec: f64,
}

// ── pure helpers (unit-tested) ────────────────────────────────────────────────

/// Standard base64 (with or without padding). Rejects anything else.
pub fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    fn val(c: u8) -> Option<u32> {
        match c {
            b'A'..=b'Z' => Some((c - b'A') as u32),
            b'a'..=b'z' => Some((c - b'a' + 26) as u32),
            b'0'..=b'9' => Some((c - b'0' + 52) as u32),
            b'+' => Some(62),
            b'/' => Some(63),
            _ => None,
        }
    }
    let bytes = input.trim_end_matches('=').as_bytes();
    if bytes.len() % 4 == 1 {
        return Err("invalid base64 length".to_string());
    }
    let mut out = Vec::with_capacity(bytes.len() * 3 / 4);
    for chunk in bytes.chunks(4) {
        let mut acc: u32 = 0;
        for (i, &c) in chunk.iter().enumerate() {
            acc |= val(c).ok_or("invalid base64 character")? << (18 - 6 * i);
        }
        out.push((acc >> 16) as u8);
        if chunk.len() > 2 {
            out.push((acc >> 8) as u8);
        }
        if chunk.len() > 3 {
            out.push(acc as u8);
        }
    }
    Ok(out)
}

pub fn is_png(bytes: &[u8]) -> bool {
    bytes.len() > PNG_SIGNATURE.len() && bytes.starts_with(PNG_SIGNATURE)
}

pub fn image_file_name(index: usize) -> String {
    format!("f{index:05}.png")
}

/// The concat-demuxer list. Only file names this module generated appear in it (safe mode accepts them), and the
/// last entry is repeated because the demuxer ignores the final `duration`.
pub fn build_ffconcat(sequence: &[OverlayStep], image_count: usize) -> Result<String, String> {
    if sequence.is_empty() || sequence.len() > MAX_STEPS {
        return Err("invalid overlay sequence length".to_string());
    }
    let mut s = String::from("ffconcat version 1.0\n");
    let mut total = 0.0;
    for step in sequence {
        let idx = step.image as usize;
        if idx >= image_count {
            return Err("overlay sequence refers to a missing image".to_string());
        }
        if !(step.duration_sec.is_finite() && step.duration_sec > 0.0 && step.duration_sec <= 86_400.0) {
            return Err("invalid overlay step duration".to_string());
        }
        total += step.duration_sec;
        s.push_str(&format!("file {}\nduration {:.6}\n", image_file_name(idx), step.duration_sec));
    }
    if total > 86_400.0 {
        return Err("overlay sequence is too long".to_string());
    }
    let last = sequence[sequence.len() - 1].image as usize;
    s.push_str(&format!("file {}\n", image_file_name(last)));
    Ok(s)
}

// ── filesystem ────────────────────────────────────────────────────────────────

fn root(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_cache_dir().map_err(|e| format!("No cache folder: {e}"))?.join(DIR_NAME);
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create the overlay cache: {e}"))?;
    dir.canonicalize().map_err(|e| format!("Cannot access the overlay cache: {e}"))
}

fn prune_stale(root: &Path) {
    let Ok(entries) = fs::read_dir(root) else { return };
    for entry in entries.flatten() {
        let old = entry
            .metadata()
            .and_then(|m| m.modified())
            .ok()
            .and_then(|t| t.elapsed().ok())
            .map(|age| age > STALE_AFTER)
            .unwrap_or(false);
        if old && entry.path().is_dir() {
            let _ = fs::remove_dir_all(entry.path());
        }
    }
}

/// Accepts only `<cache>/render-overlays/<set>/list.ffconcat` created by `write_caption_overlays`.
pub fn check_list_path(root: &Path, requested: &str) -> Result<PathBuf, String> {
    let canon = Path::new(requested).canonicalize().map_err(|_| "Caption overlays not found".to_string())?;
    let ok = canon.file_name().map(|n| n == LIST_NAME).unwrap_or(false)
        && canon.parent().and_then(|p| p.parent()).map(|p| p == root).unwrap_or(false);
    if ok {
        Ok(canon)
    } else {
        Err("Caption overlays must come from write_caption_overlays.".to_string())
    }
}

pub(crate) fn check_overlay_list(app: &AppHandle, requested: &str) -> Result<PathBuf, String> {
    check_list_path(&root(app)?, requested)
}

/// Writes the PNGs and the list; returns the list path to pass as `overlaySequence` in the render spec.
#[tauri::command]
pub async fn write_caption_overlays(app: AppHandle, images: Vec<String>, sequence: Vec<OverlayStep>) -> Result<String, String> {
    if images.is_empty() || images.len() > MAX_IMAGES {
        return Err(format!("Between 1 and {MAX_IMAGES} caption images are allowed."));
    }
    let list = build_ffconcat(&sequence, images.len())?;

    let mut decoded = Vec::with_capacity(images.len());
    let mut total = 0usize;
    for b64 in &images {
        if b64.len() > MAX_IMAGE_BYTES * 4 / 3 + 8 {
            return Err("A caption image is too large.".to_string());
        }
        let bytes = decode_base64(b64)?;
        if !is_png(&bytes) {
            return Err("Caption images must be PNG.".to_string());
        }
        total += bytes.len();
        if bytes.len() > MAX_IMAGE_BYTES || total > MAX_TOTAL_BYTES {
            return Err("The caption images are too large.".to_string());
        }
        decoded.push(bytes);
    }

    let root = root(&app)?;
    prune_stale(&root);
    let millis = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
    let dir = root.join(format!("o{millis}-{}", SET_COUNTER.fetch_add(1, Ordering::Relaxed)));
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create the overlay folder: {e}"))?;
    let write = || -> Result<(), String> {
        for (i, bytes) in decoded.iter().enumerate() {
            fs::write(dir.join(image_file_name(i)), bytes).map_err(|e| format!("Cannot write a caption image: {e}"))?;
        }
        fs::write(dir.join(LIST_NAME), list).map_err(|e| format!("Cannot write the caption list: {e}"))
    };
    if let Err(e) = write() {
        let _ = fs::remove_dir_all(&dir);
        return Err(e);
    }
    Ok(dir.join(LIST_NAME).to_string_lossy().into_owned())
}

/// Removes one overlay set (after its export finished, failed or was cancelled).
#[tauri::command]
pub fn clear_caption_overlays(app: AppHandle, list_path: String) -> Result<(), String> {
    let list = check_overlay_list(&app, &list_path)?;
    if let Some(dir) = list.parent() {
        fs::remove_dir_all(dir).map_err(|e| format!("Cannot remove the caption overlays: {e}"))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base64_round_trips_standard_alphabet() {
        assert_eq!(decode_base64("aGVsbG8=").unwrap(), b"hello");
        assert_eq!(decode_base64("aGVsbG8").unwrap(), b"hello");
        assert_eq!(decode_base64("iVBORw0KGgo=").unwrap(), PNG_SIGNATURE);
        assert_eq!(decode_base64("").unwrap(), Vec::<u8>::new());
        assert!(decode_base64("a$b=").is_err());
        assert!(decode_base64("abcde").is_err());
    }

    #[test]
    fn only_png_bytes_are_accepted() {
        let mut png = PNG_SIGNATURE.to_vec();
        png.push(0);
        assert!(is_png(&png));
        assert!(!is_png(b"GIF89a......"));
        assert!(!is_png(PNG_SIGNATURE));
    }

    #[test]
    fn ffconcat_lists_generated_names_and_repeats_the_last_entry() {
        let seq = vec![OverlayStep { image: 0, duration_sec: 1.5 }, OverlayStep { image: 1, duration_sec: 0.25 }];
        let list = build_ffconcat(&seq, 2).unwrap();
        assert_eq!(
            list,
            "ffconcat version 1.0\nfile f00000.png\nduration 1.500000\nfile f00001.png\nduration 0.250000\nfile f00001.png\n"
        );
    }

    #[test]
    fn ffconcat_rejects_bad_sequences() {
        let step = |image, d| OverlayStep { image, duration_sec: d };
        assert!(build_ffconcat(&[], 1).is_err());
        assert!(build_ffconcat(&[step(1, 1.0)], 1).is_err());
        assert!(build_ffconcat(&[step(0, 0.0)], 1).is_err());
        assert!(build_ffconcat(&[step(0, f64::NAN)], 1).is_err());
        assert!(build_ffconcat(&[step(0, 50_000.0), step(0, 50_000.0)], 1).is_err());
        assert!(build_ffconcat(&vec![step(0, 0.1); MAX_STEPS + 1], 1).is_err());
    }

    #[test]
    fn list_path_must_be_a_generated_list_inside_the_cache() {
        let base = std::env::temp_dir().join(format!("ovl-test-{}", std::process::id()));
        let root = base.join(DIR_NAME);
        let set = root.join("o1-1");
        fs::create_dir_all(&set).unwrap();
        fs::write(set.join(LIST_NAME), "ffconcat version 1.0\n").unwrap();
        fs::write(set.join("other.txt"), "x").unwrap();
        fs::write(base.join(LIST_NAME), "x").unwrap();
        let root = root.canonicalize().unwrap();

        assert!(check_list_path(&root, &set.join(LIST_NAME).to_string_lossy()).is_ok());
        assert!(check_list_path(&root, &set.join("other.txt").to_string_lossy()).is_err());
        assert!(check_list_path(&root, &base.join(LIST_NAME).to_string_lossy()).is_err());
        assert!(check_list_path(&root, &set.join("..").join("o1-1").join(LIST_NAME).to_string_lossy()).is_ok());
        assert!(check_list_path(&root, &root.join("missing").join(LIST_NAME).to_string_lossy()).is_err());
        let _ = fs::remove_dir_all(&base);
    }
}
