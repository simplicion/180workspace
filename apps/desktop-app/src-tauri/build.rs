fn main() {
    // Restrict the IPC surface to exactly these app commands. Each name becomes a permission `allow-<name-with-dashes>`
    // that capabilities/main.json must grant explicitly, so a command added later is NOT reachable from the web
    // content until someone deliberately opts it in.
    tauri_build::try_build(
        tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(&[
            "engine_info",
            "pick_media_files",
            "probe_media",
            "pick_export_path",
            "transcode_media",
        ])),
    )
    .expect("failed to run tauri-build");
}
