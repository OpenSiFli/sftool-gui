use crate::commands::*;
use crate::state::AppState;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;

fn set_dynamic_updater_endpoint<R: tauri::Runtime>(context: &mut tauri::Context<R>) {
    const CN_ENDPOINT: &str = "https://downloads.sifli.com/sftool-gui/cn/latest.json";
    const GLOBAL_ENDPOINT: &str = "https://downloads.sifli.com/sftool-gui/global/latest.json";

    let mut endpoint = GLOBAL_ENDPOINT.to_string();

    if let Ok(client) = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
    {
        if let Ok(resp) = client.get("https://ipinfo.io/json").send() {
            if let Ok(json) = resp.json::<serde_json::Value>() {
                if let Some(country) = json.get("country").and_then(|c| c.as_str()) {
                    if country.eq_ignore_ascii_case("CN") {
                        endpoint = CN_ENDPOINT.to_string();
                    }
                }
            }
        }
    }

    // 更新 Tauri 配置中的 updater endpoints
    if let Some(cfg) = context.config_mut().plugins.0.get_mut("updater") {
        if let Some(obj) = cfg.as_object_mut() {
            obj.insert("endpoints".to_string(), serde_json::json!([endpoint]));
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut context = tauri::generate_context!();
    set_dynamic_updater_endpoint(&mut context);

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
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
            extract_archive,
            write_flash,
            read_flash,
            erase_flash,
            erase_region,
            set_speed,
            soft_reset,
            mass_production_start,
            mass_production_stop,
            mass_production_refresh,
            mass_production_set_auto_download,
            mass_production_get_snapshot,
            mass_production_get_log_paths,
            mass_production_open_port_log,
            mass_production_open_log_directory
        ])
        .build(context)
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        // 在应用即将退出时清理临时目录
        if let tauri::RunEvent::ExitRequested { .. } = event {
            if let Ok(mut app_state) = app_handle.state::<Mutex<AppState>>().lock() {
                app_state.cleanup_temp_dirs();
            }
        }
    });
}
