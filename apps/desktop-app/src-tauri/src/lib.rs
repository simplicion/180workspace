//! 180 Workspace desktop shell.
//!
//! One app for the whole platform (not just the video editor): a native window that loads the 180 Workspace web app,
//! adds offline support on top of it (the web app's local database + service worker), and provides the native
//! capabilities the browser cannot: local file access and bundled FFmpeg for all media processing.

mod media;
mod render;

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_deep_link::DeepLinkExt;

const DEFAULT_APP_ORIGIN: &str = "https://app.180workspace.com";
const DEEP_LINK_SCHEME: &str = "workspace180://";

/// The web app this shell loads. Release builds use the origin compiled in (or the default); only debug builds may be
/// pointed elsewhere (e.g. http://localhost:3002) through WORKSPACE180_APP_ORIGIN, so a user-set environment variable
/// can never redirect a shipped app to a different site.
fn app_origin() -> String {
    if cfg!(debug_assertions) {
        if let Ok(origin) = std::env::var("WORKSPACE180_APP_ORIGIN") {
            if origin.starts_with("https://") || origin.starts_with("http://localhost") || origin.starts_with("http://127.0.0.1") {
                return origin.trim_end_matches('/').to_string();
            }
        }
    }
    option_env!("WORKSPACE180_APP_ORIGIN")
        .unwrap_or(DEFAULT_APP_ORIGIN)
        .trim_end_matches('/')
        .to_string()
}

/// `workspace180://media-editor?project=abc` -> `/media-editor?project=abc`. Anything outside a conservative
/// character set is rejected so a crafted link can never smuggle script or another origin into the navigation.
fn route_from_deep_link(raw: &str) -> Option<String> {
    let rest = raw.strip_prefix(DEEP_LINK_SCHEME)?.trim_start_matches('/');
    if rest.len() > 512 || rest.contains("..") {
        return None;
    }
    if !rest.chars().all(|c| c.is_ascii_alphanumeric() || "/-_.~?=&%".contains(c)) {
        return None;
    }
    Some(format!("/{rest}"))
}

fn focus_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn open_route(app: &tauri::AppHandle, route: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let target = format!("{}{}", app_origin(), route);
        if let Ok(js_string) = serde_json::to_string(&target) {
            let _ = window.eval(&format!("window.location.assign({js_string})"));
        }
    }
    focus_main(app);
}

/// Runs before any page script (both the local bootstrap page and the web app), so the web app can reliably detect
/// that it is running inside the desktop app. Deliberately reports only facts, no capability claims.
fn init_script(origin: &str, route: &str) -> String {
    let json = |s: &str| serde_json::to_string(s).unwrap_or_else(|_| "\"\"".to_string());
    format!(
        "(function(){{ if (window.__180_NATIVE__) return; \
           window.__180_APP_ORIGIN__ = {origin}; \
           window.__180_INITIAL_ROUTE__ = {route}; \
           window.__180_NATIVE__ = Object.freeze({{ isNative: true, shell: 'tauri', platform: {os}, version: {version} }}); \
         }})();",
        origin = json(origin),
        route = json(route),
        os = json(std::env::consts::OS),
        version = json(env!("CARGO_PKG_VERSION")),
    )
}

pub fn run() {
    let builder = tauri::Builder::default();

    // Must be registered first. A second launch (for example clicking a workspace180:// link while the app is
    // running) hands its arguments to the running instance instead of opening another window.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
        match argv.iter().find_map(|a| route_from_deep_link(a)) {
            Some(route) => open_route(app, &route),
            None => focus_main(app),
        }
    }));

    builder
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_deep_link::init())
        .manage(media::AllowedPaths::default())
        .manage(render::RenderJobs::default())
        .setup(|app| {
            let origin = app_origin();
            let initial_route = std::env::args()
                .find_map(|a| route_from_deep_link(&a))
                .unwrap_or_else(|| "/".to_string());

            // The window is created here (not in tauri.conf.json) so the initialization script is attached before the
            // first page loads. It starts on the bundled shell page, which decides how to reach the web app.
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title("180 Workspace")
                .inner_size(1440.0, 900.0)
                .min_inner_size(1024.0, 700.0)
                .initialization_script(&init_script(&origin, &initial_route))
                .build()?;

            // Media picked in earlier sessions stays usable, so reopened projects keep working.
            media::load_remembered(app.handle(), &app.state::<media::AllowedPaths>());

            // Installed builds register the scheme via the installer; while developing there is no installer.
            #[cfg(all(debug_assertions, any(windows, target_os = "linux")))]
            app.deep_link().register_all()?;

            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                for url in event.urls() {
                    if let Some(route) = route_from_deep_link(url.as_str()) {
                        open_route(&handle, &route);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            media::engine_info,
            media::pick_media_files,
            media::probe_media,
            media::pick_export_path,
            media::transcode_media,
            render::render_timeline,
            render::render_status,
            render::cancel_render,
        ])
        .run(tauri::generate_context!())
        .expect("error while running the 180 Workspace desktop app");
}

#[cfg(test)]
mod tests {
    use super::route_from_deep_link;

    #[test]
    fn accepts_plain_routes() {
        assert_eq!(route_from_deep_link("workspace180://media-editor?project=abc").as_deref(), Some("/media-editor?project=abc"));
        assert_eq!(route_from_deep_link("workspace180:///crm/deals").as_deref(), Some("/crm/deals"));
        assert_eq!(route_from_deep_link("workspace180://").as_deref(), Some("/"));
    }

    #[test]
    fn rejects_traversal_scripts_and_foreign_schemes() {
        for bad in [
            "workspace180://../etc/passwd",
            "workspace180://a/../b",
            "workspace180://x;alert(1)",
            "workspace180://x\"y",
            "workspace180://javascript:alert(1)",
            "https://evil.example/",
            "workspace180://a b",
        ] {
            assert!(route_from_deep_link(bad).is_none(), "{bad}");
        }
        assert!(route_from_deep_link(&format!("workspace180://{}", "a".repeat(600))).is_none());
    }
}
