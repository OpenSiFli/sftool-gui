use crate::progress::TauriProgressCallback;
use crate::state::AppState;
use crate::types::{DeviceConfig, PortInfo};
use crate::utils::{create_tool_instance_with_progress, list_serial_ports};
use chrono::Local;
use serde_json::json;
use sftool_lib::progress::ProgressSinkArc;
use sftool_lib::CancelToken;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

fn emit_system_log(app_handle: &AppHandle, message: &str, important: bool) {
    let timestamp = Local::now().format("%H:%M:%S");
    let formatted_message = format!("[{}] {}", timestamp, message);

    if let Err(error) = app_handle.emit(
        "log-message",
        json!({
            "message": formatted_message,
            "important": important,
        }),
    ) {
        eprintln!("Failed to emit system log message: {error}");
    }
}

#[tauri::command]
pub fn get_serial_ports() -> Result<Vec<PortInfo>, String> {
    list_serial_ports()
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
    stub_config_path: String,
    external_stub_path: String,
    before_operation: String,
    after_operation: String,
) -> Result<bool, String> {
    let device_config = DeviceConfig {
        chip_type: chip_model,
        memory_type,
        port_name: port.ok_or("端口名不能为空")?,
        baud_rate: baud_rate.ok_or("波特率不能为空")?,
        stub_config_path,
        external_stub_path,
        // keep before/after as strings for serde transport; parsing happens in tool factory
        before_operation,
        after_operation,
    };

    // 创建 Tauri 进度回调
    let progress_callback: ProgressSinkArc =
        Arc::new(TauriProgressCallback::new(app_handle.clone()));

    // 创建带进度回调的工具实例
    let tool = match create_tool_instance_with_progress(
        &device_config,
        progress_callback,
        CancelToken::new(),
    ) {
        Ok(tool) => tool,
        Err(error) => {
            emit_system_log(&app_handle, &format!("连接失败: {error}"), true);
            return Err(error);
        }
    };

    // 保存设备配置和工具实例到状态
    let mut app_state = state.lock().unwrap();
    app_state.device_config = Some(device_config);
    app_state.sftool = Some(Arc::new(Mutex::new(tool)));

    Ok(true)
}

#[tauri::command]
pub fn disconnect_device(state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let mut app_state = state.lock().unwrap();
    app_state.clear_device_connection();
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
