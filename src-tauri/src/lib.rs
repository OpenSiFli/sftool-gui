// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};

use sftool_lib::ram_command::DownloadStub;
use sftool_lib::SifliTool;
use std::sync::Mutex;
use tauri::{Manager, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct PortInfo {
    name: String,
    port_type: String,
}

pub struct AppState {
    sftool: Option<SifliTool>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState { sftool: None }
    }
}

#[tauri::command]
fn get_serial_ports() -> Result<Vec<PortInfo>, String> {
    let ports = match serialport::available_ports() {
        Ok(ports) => ports,
        Err(e) => return Err(format!("无法获取串口列表: {}", e)),
    };

    let port_infos = ports
        .into_iter()
        .map(|p| {
            let port_type = match p.port_type {
                serialport::SerialPortType::UsbPort(info) => {
                    format!("USB ({:04x}:{:04x})", info.vid, info.pid)
                }
                serialport::SerialPortType::BluetoothPort => "蓝牙".to_string(),
                serialport::SerialPortType::PciPort => "PCI".to_string(),
                _ => "未知".to_string(),
            };

            PortInfo {
                name: p.port_name,
                port_type,
            }
        })
        .collect();

    Ok(port_infos)
}

#[tauri::command]
async fn connect_device(
    state: State<'_, Mutex<AppState>>,
    chip_model: String,
    memory_type: String,
    interface_type: String,
    port: Option<String>,
    baud_rate: Option<u32>,
) -> Result<bool, String> {
    let mut siflitool = SifliTool::new(
        sftool_lib::SifliToolBase {
            port_name: port.unwrap(),
            before: sftool_lib::Operation::None,
            chip: chip_model.to_lowercase(),
            memory_type: memory_type.to_lowercase(),
            baud: baud_rate.unwrap(),
            connect_attempts: 3,
            compat: false,
            quiet: true,
        },
        None,
    );
    // siflitool.download_stub().map_err(|e| {
    //     e.to_string()
    // })?;

    let mut state = state.lock().unwrap();
    state.sftool = Some(siflitool);

    Ok(true)
}

#[tauri::command]
fn disconnect_device() -> Result<(), String> {
    // 函数体待实现
    Ok(())
}

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
            disconnect_device
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
