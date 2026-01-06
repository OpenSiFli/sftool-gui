use crate::progress::TauriProgressCallback;
use crate::state::AppState;
use crate::types::{DeviceConfig, PortInfo};
use crate::utils::create_tool_instance_with_progress;
use sftool_lib::progress::ProgressCallbackArc;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, State};

#[tauri::command]
pub fn get_serial_ports() -> Result<Vec<PortInfo>, String> {
    let ports = match serialport::available_ports() {
        Ok(ports) => ports,
        Err(e) => return Err(format!("无法获取串口列表: {}", e)),
    };

    let port_infos = ports
        .into_iter()
        .filter(|_p| {
            // 在 macOS 下过滤掉 /dev/tty* 开头的串口，只保留 /dev/cu* 的
            #[cfg(target_os = "macos")]
            {
                if _p.port_name.starts_with("/dev/tty") {
                    return false;
                }
            }
            true
        })
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
pub async fn connect_device(
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
    chip_model: String,
    memory_type: String,
    _interface_type: String,
    port: Option<String>,
    baud_rate: Option<u32>,
    stub_path: String,
) -> Result<bool, String> {
    let device_config = DeviceConfig {
        chip_type: chip_model,
        memory_type,
        port_name: port.ok_or("端口名不能为空")?,
        baud_rate: baud_rate.ok_or("波特率不能为空")?,
        stub_path,
    };

    // 创建 Tauri 进度回调
    let progress_callback: ProgressCallbackArc = Arc::new(TauriProgressCallback::new(app_handle));

    // 创建带进度回调的工具实例
    let tool = create_tool_instance_with_progress(&device_config, progress_callback)?;

    // 保存设备配置和工具实例到状态
    let mut app_state = state.lock().unwrap();
    app_state.device_config = Some(device_config);
    app_state.sftool = Some(Arc::new(Mutex::new(tool)));

    Ok(true)
}

#[tauri::command]
pub fn disconnect_device(state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let mut app_state = state.lock().unwrap();
    app_state.device_config = None;
    app_state.sftool = None;
    Ok(())
}

#[tauri::command]
pub async fn set_speed(state: State<'_, Mutex<AppState>>, baud_rate: u32) -> Result<(), String> {
    let sftool = {
        let app_state = state.lock().unwrap();
        app_state
            .sftool
            .as_ref()
            .ok_or("设备未连接，请先连接设备")?
            .clone()
    };

    let mut tool = sftool.lock().unwrap();
    tool.set_speed(baud_rate)
        .map_err(|e| format!("设置速度失败: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn soft_reset(state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let sftool = {
        let app_state = state.lock().unwrap();
        app_state
            .sftool
            .as_ref()
            .ok_or("设备未连接，请先连接设备")?
            .clone()
    };

    let mut tool = sftool.lock().unwrap();
    tool.soft_reset()
        .map_err(|e| format!("软重置失败: {}", e))?;

    Ok(())
}
