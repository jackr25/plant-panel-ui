//! Tauri shell. The UI talks to plantd itself; the Rust side only provides the HTTP
//! plugin, so requests bypass webview CORS / mixed-content rules and resolve `.local`
//! names through the OS.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
