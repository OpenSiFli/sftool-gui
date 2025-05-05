// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct PortInfo {
    name: String,
    port_type: String,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, get_serial_ports])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
