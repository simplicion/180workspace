//! Downloads remote stock media (video, music, SFX, photos) into the app cache so the native renderer can use it.
//!
//! The web content may only name an https URL on an allow-listed media host; it never chooses the destination. Rules:
//!  * https only, default port, no credentials in the URL; every redirect hop is re-checked against the same rules;
//!  * hosts: the stock/music providers the editor uses (`BUILTIN_HOSTS`, subdomains included) plus the platform's own
//!    storage/CDN hosts from `STUDIO_MEDIA_HOSTS` (comma-separated; read at build time and at run time — host names
//!    only, no credentials);
//!  * `Content-Type` must be video/*, audio/* or image/* (or a generic binary type with a known media extension);
//!  * size caps per kind, a connect timeout and an overall timeout;
//!  * cached by URL hash (`<hash>.<ext>` with a `<hash>.url` sidecar that must match on a hit), written to `.part`
//!    first and renamed when complete.
//! Downloaded files are allowed for probing/rendering in this session only (never remembered across restarts).
//! Progress is polled with `remote_media_status`, like `render_status`.

use std::{
    collections::{hash_map::DefaultHasher, HashMap},
    fs,
    hash::{Hash, Hasher},
    io::Write,
    path::PathBuf,
    sync::Mutex,
    time::Duration,
};

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::media::AllowedPaths;

pub const BUILTIN_HOSTS: &[&str] = &[
    "pexels.com",       // videos.pexels.com, images.pexels.com
    "player.vimeo.com", // older Pexels video file links
    "vimeocdn.com",
    "pixabay.com", // cdn.pixabay.com
    "nasa.gov",    // images-assets.nasa.gov
    "freepd.com",
    "freesound.org", // cdn.freesound.org previews
    "wikimedia.org", // upload.wikimedia.org (Openverse / Commons)
    "jamendo.com",   // prod-1.storage.jamendo.com
    "unsplash.com",  // images.unsplash.com
    "staticflickr.com",
    "archive.org",
];
const ENV_HOSTS: &str = "STUDIO_MEDIA_HOSTS";
const MAX_REDIRECTS: usize = 5;
const MAX_VIDEO_BYTES: u64 = 1024 * 1024 * 1024;
const MAX_AUDIO_BYTES: u64 = 200 * 1024 * 1024;
const MAX_IMAGE_BYTES: u64 = 50 * 1024 * 1024;
const MAX_URL_LEN: usize = 4096;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MediaKind {
    Video,
    Audio,
    Image,
}

impl MediaKind {
    pub fn max_bytes(self) -> u64 {
        match self {
            MediaKind::Video => MAX_VIDEO_BYTES,
            MediaKind::Audio => MAX_AUDIO_BYTES,
            MediaKind::Image => MAX_IMAGE_BYTES,
        }
    }
}

#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub received: u64,
    pub total: Option<u64>,
    pub done: bool,
    pub error: Option<String>,
    /// Set by `cancel_remote_media`; the download loop stops at the next chunk and removes the partial file.
    pub cancelled: bool,
}

#[derive(Default)]
pub struct RemoteDownloads(Mutex<HashMap<String, DownloadProgress>>);

// ── pure checks (unit-tested) ─────────────────────────────────────────────────

/// Extra hosts from the build (`option_env!`) and the environment. Host names only.
pub fn configured_hosts() -> Vec<String> {
    let mut out = Vec::new();
    let sources = [option_env!("STUDIO_MEDIA_HOSTS").map(str::to_string), std::env::var(ENV_HOSTS).ok()];
    for list in sources.into_iter().flatten() {
        for h in list.split(',') {
            let h = h.trim().trim_start_matches("*.").to_ascii_lowercase();
            if !h.is_empty() && h.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-') && h.contains('.') {
                out.push(h);
            }
        }
    }
    out
}

/// `host` equals an allowed domain or is a subdomain of it (label boundary, so `evilpexels.com` does not match).
pub fn host_allowed(host: &str, extra: &[String]) -> bool {
    let host = host.trim_end_matches('.').to_ascii_lowercase();
    BUILTIN_HOSTS
        .iter()
        .map(|s| s.to_string())
        .chain(extra.iter().cloned())
        .any(|d| host == d || host.ends_with(&format!(".{d}")))
}

pub fn check_url(url: &reqwest::Url, extra: &[String]) -> Result<(), String> {
    if url.scheme() != "https" {
        return Err("Only https media links can be downloaded.".to_string());
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err("Media links must not contain credentials.".to_string());
    }
    if url.port().is_some() {
        return Err("Media links must use the default https port.".to_string());
    }
    let host = url.host_str().ok_or("Media link has no host")?;
    if !host_allowed(host, extra) {
        return Err(format!("{host} is not an allowed media source."));
    }
    Ok(())
}

pub fn parse_url(raw: &str, extra: &[String]) -> Result<reqwest::Url, String> {
    if raw.len() > MAX_URL_LEN {
        return Err("Media link is too long.".to_string());
    }
    let url = reqwest::Url::parse(raw).map_err(|_| "Invalid media link.".to_string())?;
    check_url(&url, extra)?;
    Ok(url)
}

fn ext_from_path(path: &str) -> Option<&'static str> {
    let ext = path.rsplit('.').next()?.to_ascii_lowercase();
    Some(match ext.as_str() {
        "mp4" | "m4v" => "mp4",
        "mov" => "mov",
        "webm" => "webm",
        "mp3" => "mp3",
        "wav" => "wav",
        "ogg" | "oga" => "ogg",
        "m4a" => "m4a",
        "aac" => "aac",
        "flac" => "flac",
        "jpg" | "jpeg" => "jpg",
        "png" => "png",
        "webp" => "webp",
        "gif" => "gif",
        _ => return None,
    })
}

fn kind_of_ext(ext: &str) -> MediaKind {
    match ext {
        "mp4" | "mov" | "webm" => MediaKind::Video,
        "jpg" | "png" | "webp" | "gif" => MediaKind::Image,
        _ => MediaKind::Audio,
    }
}

/// File extension + kind from the response `Content-Type`, falling back to the URL path only for generic binary types.
pub fn media_type(content_type: Option<&str>, url_path: &str) -> Result<(&'static str, MediaKind), String> {
    let ct = content_type.unwrap_or("").split(';').next().unwrap_or("").trim().to_ascii_lowercase();
    let ext = match ct.as_str() {
        "video/mp4" => "mp4",
        "video/quicktime" => "mov",
        "video/webm" => "webm",
        "audio/mpeg" | "audio/mp3" => "mp3",
        "audio/wav" | "audio/x-wav" | "audio/wave" | "audio/vnd.wave" => "wav",
        "audio/ogg" | "application/ogg" => "ogg",
        "audio/mp4" | "audio/x-m4a" => "m4a",
        "audio/aac" => "aac",
        "audio/flac" | "audio/x-flac" => "flac",
        "image/jpeg" | "image/jpg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp",
        "image/gif" => "gif",
        "application/octet-stream" | "binary/octet-stream" | "" => {
            ext_from_path(url_path).ok_or("The link is not a video, audio or image file.")?
        }
        other if other.starts_with("video/") || other.starts_with("audio/") || other.starts_with("image/") => {
            ext_from_path(url_path).ok_or(format!("Unsupported media type {other}."))?
        }
        other => return Err(format!("The link returned {other}, not a video, audio or image file.")),
    };
    Ok((ext, kind_of_ext(ext)))
}

pub fn cache_key(url: &str) -> String {
    let mut h = DefaultHasher::new();
    url.hash(&mut h);
    format!("{:016x}{:04x}", h.finish(), url.len() % 0x10000)
}

// ── command ───────────────────────────────────────────────────────────────────

fn cache_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_cache_dir().map_err(|e| format!("No cache folder: {e}"))?.join("remote-media");
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create the media cache: {e}"))?;
    Ok(dir)
}

fn cached_hit(dir: &PathBuf, key: &str, url: &str) -> Option<PathBuf> {
    if fs::read_to_string(dir.join(format!("{key}.url"))).ok()? != url {
        return None;
    }
    fs::read_dir(dir).ok()?.flatten().map(|e| e.path()).find(|p| {
        p.file_stem().map(|s| s == key).unwrap_or(false)
            && p.extension().map(|e| e != "url" && e != "part").unwrap_or(false)
            && p.is_file()
    })
}

fn set_progress(downloads: &RemoteDownloads, url: &str, f: impl FnOnce(&mut DownloadProgress)) {
    if let Ok(mut map) = downloads.0.lock() {
        if map.len() > 500 {
            map.retain(|_, p| !p.done);
        }
        f(map.entry(url.to_string()).or_default());
    }
}

pub const DOWNLOAD_CANCELLED: &str = "DOWNLOAD_CANCELLED: The download was cancelled.";

fn is_cancelled(downloads: &RemoteDownloads, url: &str) -> bool {
    downloads.0.lock().map(|m| m.get(url).map(|p| p.cancelled).unwrap_or(false)).unwrap_or(false)
}

async fn download(url: &reqwest::Url, dir: &PathBuf, key: &str, downloads: &RemoteDownloads, progress_key: &str) -> Result<PathBuf, String> {
    let extra = configured_hosts();
    let policy_hosts = extra.clone();
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::custom(move |attempt| {
            if attempt.previous().len() >= MAX_REDIRECTS {
                attempt.error("too many redirects")
            } else if let Err(e) = check_url(attempt.url(), &policy_hosts) {
                attempt.error(e)
            } else {
                attempt.follow()
            }
        }))
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(600))
        .build()
        .map_err(|e| format!("Download client error: {e}"))?;

    let mut resp = client.get(url.clone()).send().await.map_err(|e| format!("Download failed: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("Download failed: HTTP {}", resp.status().as_u16()));
    }
    check_url(resp.url(), &extra)?;
    let ct = resp.headers().get(reqwest::header::CONTENT_TYPE).and_then(|v| v.to_str().ok()).map(str::to_string);
    let (ext, kind) = media_type(ct.as_deref(), resp.url().path())?;
    let cap = kind.max_bytes();
    let total = resp.content_length();
    if total.map(|t| t > cap).unwrap_or(false) {
        return Err(format!("The file is larger than the {} MB limit.", cap / (1024 * 1024)));
    }
    let key_url = progress_key.to_string();
    set_progress(downloads, &key_url, |p| p.total = total);

    let part = dir.join(format!("{key}.part"));
    let mut file = fs::File::create(&part).map_err(|e| format!("Cannot write to the media cache: {e}"))?;
    let mut received: u64 = 0;
    let result: Result<(), String> = async {
        while let Some(chunk) = resp.chunk().await.map_err(|e| format!("Download interrupted: {e}"))? {
            if is_cancelled(downloads, &key_url) {
                return Err(DOWNLOAD_CANCELLED.to_string());
            }
            received += chunk.len() as u64;
            if received > cap {
                return Err(format!("The file is larger than the {} MB limit.", cap / (1024 * 1024)));
            }
            file.write_all(&chunk).map_err(|e| format!("Cannot write to the media cache: {e}"))?;
            set_progress(downloads, &key_url, |p| p.received = received);
        }
        file.flush().map_err(|e| e.to_string())?;
        if received == 0 {
            return Err("The download was empty.".to_string());
        }
        Ok(())
    }
    .await;
    drop(file);
    if let Err(e) = result {
        let _ = fs::remove_file(&part);
        return Err(e);
    }
    let final_path = dir.join(format!("{key}.{ext}"));
    fs::rename(&part, &final_path).map_err(|e| format!("Cannot finish the download: {e}"))?;
    fs::write(dir.join(format!("{key}.url")), url.as_str()).map_err(|e| format!("Cannot write to the media cache: {e}"))?;
    Ok(final_path)
}

/// Downloads (or reuses the cached copy of) one media link; resolves to the local path, which the render and probe
/// commands then accept.
#[tauri::command]
pub async fn fetch_remote_media(
    app: AppHandle,
    allowed: State<'_, AllowedPaths>,
    downloads: State<'_, RemoteDownloads>,
    url: String,
) -> Result<String, String> {
    let parsed = parse_url(&url, &configured_hosts())?;
    let dir = cache_dir(&app)?;
    let key = cache_key(parsed.as_str());
    let path = match cached_hit(&dir, &key, parsed.as_str()) {
        Some(p) => p,
        None => {
            set_progress(&downloads, &url, |p| *p = DownloadProgress::default());
            match download(&parsed, &dir, &key, &downloads, &url).await {
                Ok(p) => p,
                Err(e) => {
                    set_progress(&downloads, &url, |p| {
                        p.done = true;
                        p.error = Some(e.clone());
                    });
                    return Err(e);
                }
            }
        }
    };
    let canonical = allowed.allow_session_file(&path)?;
    set_progress(&downloads, &url, |p| p.done = true);
    Ok(canonical)
}

#[tauri::command]
pub fn remote_media_status(downloads: State<'_, RemoteDownloads>, url: String) -> Result<Option<DownloadProgress>, String> {
    let map = downloads.0.lock().map_err(|_| "internal state error".to_string())?;
    Ok(map.get(&url).cloned())
}

/// Stops a running download (the partial file is removed). A finished or unknown download is left alone.
#[tauri::command]
pub fn cancel_remote_media(downloads: State<'_, RemoteDownloads>, url: String) -> Result<(), String> {
    let mut map = downloads.0.lock().map_err(|_| "internal state error".to_string())?;
    if let Some(p) = map.get_mut(&url) {
        if !p.done {
            p.cancelled = true;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hosts_match_on_label_boundaries_only() {
        let extra = vec!["media.example-cdn.net".to_string()];
        for ok in ["videos.pexels.com", "pexels.com", "cdn.pixabay.com", "images-assets.nasa.gov", "cdn.freesound.org", "freepd.com", "upload.wikimedia.org", "media.example-cdn.net", "a.media.example-cdn.net", "VIDEOS.PEXELS.COM."] {
            assert!(host_allowed(ok, &extra), "{ok}");
        }
        for bad in ["evilpexels.com", "pexels.com.evil.io", "example-cdn.net", "localhost", "127.0.0.1", "nasa.gov.attacker.org"] {
            assert!(!host_allowed(bad, &extra), "{bad}");
        }
    }

    #[test]
    fn urls_must_be_plain_https_on_allowed_hosts() {
        let none: Vec<String> = vec![];
        assert!(parse_url("https://videos.pexels.com/video-files/1/a.mp4", &none).is_ok());
        for bad in [
            "http://videos.pexels.com/a.mp4",
            "file:///etc/passwd",
            "https://user:pw@videos.pexels.com/a.mp4",
            "https://videos.pexels.com:8443/a.mp4",
            "https://evil.example/a.mp4",
            "https://169.254.169.254/latest/meta-data",
            "not a url",
        ] {
            assert!(parse_url(bad, &none).is_err(), "{bad}");
        }
        assert!(parse_url(&format!("https://pexels.com/{}", "a".repeat(5000)), &none).is_err());
    }

    #[test]
    fn content_type_decides_the_extension_and_cap() {
        assert_eq!(media_type(Some("video/mp4"), "/x").unwrap(), ("mp4", MediaKind::Video));
        assert_eq!(media_type(Some("audio/mpeg; charset=binary"), "/x").unwrap(), ("mp3", MediaKind::Audio));
        assert_eq!(media_type(Some("image/jpeg"), "/x.png").unwrap(), ("jpg", MediaKind::Image));
        assert_eq!(media_type(Some("application/octet-stream"), "/song.MP3").unwrap(), ("mp3", MediaKind::Audio));
        assert_eq!(media_type(None, "/p.webp").unwrap(), ("webp", MediaKind::Image));
        assert!(media_type(Some("text/html"), "/a.mp4").is_err());
        assert!(media_type(Some("application/octet-stream"), "/a.exe").is_err());
        assert!(media_type(Some("application/x-msdownload"), "/a.mp4").is_err());
        assert!(MediaKind::Image.max_bytes() < MediaKind::Video.max_bytes());
    }

    #[test]
    fn cancel_flag_only_applies_to_the_running_download() {
        let d = RemoteDownloads::default();
        set_progress(&d, "https://a/1.mp4", |p| p.received = 10);
        assert!(!is_cancelled(&d, "https://a/1.mp4"));
        d.0.lock().unwrap().get_mut("https://a/1.mp4").unwrap().cancelled = true;
        assert!(is_cancelled(&d, "https://a/1.mp4"));
        assert!(!is_cancelled(&d, "https://a/2.mp4"));
    }

    #[test]
    fn cache_keys_are_stable_and_distinct() {
        let a = cache_key("https://videos.pexels.com/a.mp4");
        assert_eq!(a, cache_key("https://videos.pexels.com/a.mp4"));
        assert_ne!(a, cache_key("https://videos.pexels.com/b.mp4"));
        assert!(a.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
