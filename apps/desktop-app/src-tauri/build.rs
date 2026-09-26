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
            "detect_silences",
            "extract_audio_for_transcription",
            "render_timeline",
            "render_status",
            "cancel_render",
            "write_caption_overlays",
            "clear_caption_overlays",
            "fetch_remote_media",
            "remote_media_status",
        ])),
    )
    .expect("failed to run tauri-build");
}
