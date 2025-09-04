use crate::state::AppState;
use crate::commands::*;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            app.manage(Mutex::new(AppState::default()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_serial_ports,
            connect_device,
            disconnect_device,
            parse_sftool_param_file,
            validate_firmware_file,
            write_flash,
            read_flash,
            erase_flash,
            set_speed,
            soft_reset
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
