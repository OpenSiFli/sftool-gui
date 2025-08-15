// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};

use sftool_lib::{
    create_sifli_tool, ChipType, Operation, SifliToolBase, SifliTool,
    WriteFlashParams,
    ReadFlashParams, ReadFlashFile,
    EraseFlashParams,
    progress::{ProgressCallback, ProgressInfo, ProgressId, ProgressCallbackArc},
    utils::Utils,
};
use std::sync::{Arc, Mutex, atomic::{AtomicU64, Ordering}};
use tauri::{AppHandle, Manager, State, Emitter};

#[derive(Debug, Serialize, Deserialize)]
pub struct PortInfo {
    name: String,
    port_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceConfig {
    pub chip_type: String,
    pub memory_type: String,
    pub port_name: String,
    pub baud_rate: u32,
}

pub struct AppState {
    device_config: Option<DeviceConfig>,
    sftool: Option<Arc<Mutex<Box<dyn SifliTool>>>>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState { 
            device_config: None,
            sftool: None,
        }
    }
}

// Tauri 进度事件结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TauriProgressEvent {
    pub id: u64,
    pub event_type: String, // "start", "update", "increment", "finish"
    pub step: String,
    pub message: String,
    pub current: Option<u64>,
    pub total: Option<u64>,
}

// Tauri 进度回调实现
pub struct TauriProgressCallback {
    app_handle: AppHandle,
    id_counter: AtomicU64,
}

impl TauriProgressCallback {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            id_counter: AtomicU64::new(1),
        }
    }

    fn emit_event(&self, event: TauriProgressEvent) {
        if let Err(e) = self.app_handle.emit("flash-progress", &event) {
            eprintln!("Failed to emit progress event: {}", e);
        }
    }
}

impl ProgressCallback for TauriProgressCallback {
    fn start(&self, info: ProgressInfo) -> ProgressId {
        let id = self.id_counter.fetch_add(1, Ordering::SeqCst);
        let progress_id = ProgressId(id);
        
        let (total, current) = match info.progress_type {
            sftool_lib::progress::ProgressType::Spinner => (None, None),
            sftool_lib::progress::ProgressType::Bar { total } => (Some(total), info.current),
        };

        let event = TauriProgressEvent {
            id,
            event_type: "start".to_string(),
            step: info.prefix,
            message: info.message,
            current,
            total,
        };

        self.emit_event(event);
        progress_id
    }

    fn update_message(&self, id: ProgressId, message: String) {
        let event = TauriProgressEvent {
            id: id.0,
            event_type: "update".to_string(),
            step: "".to_string(),
            message,
            current: None,
            total: None,
        };

        self.emit_event(event);
    }

    fn increment(&self, id: ProgressId, delta: u64) {
        let event = TauriProgressEvent {
            id: id.0,
            event_type: "increment".to_string(),
            step: "".to_string(),
            message: "".to_string(),
            current: Some(delta),
            total: None,
        };

        self.emit_event(event);
    }

    fn finish(&self, id: ProgressId, final_message: String) {
        let event = TauriProgressEvent {
            id: id.0,
            event_type: "finish".to_string(),
            step: "".to_string(),
            message: final_message,
            current: None,
            total: None,
        };

        self.emit_event(event);
    }
}

// 辅助函数：创建 SifliTool 实例
fn create_tool_instance(config: &DeviceConfig) -> Result<Box<dyn sftool_lib::SifliTool>, String> {
    // 解析芯片类型
    let chip_type = match config.chip_type.to_uppercase().as_str() {
        "SF32LB52" => ChipType::SF32LB52,
        "SF32LB56" => ChipType::SF32LB56,
        "SF32LB58" => ChipType::SF32LB58,
        _ => return Err(format!("不支持的芯片型号: {}", config.chip_type)),
    };

    // 创建 SifliToolBase (无进度回调)
    let base = SifliToolBase::new_with_no_progress(
        config.port_name.clone(),
        Operation::None,
        config.memory_type.to_lowercase(),
        config.baud_rate,
        3,
        false,
    );

    // 创建对应的工具实例
    let tool = create_sifli_tool(chip_type, base);
    Ok(tool)
}

// 辅助函数：创建带进度回调的 SifliTool 实例
fn create_tool_instance_with_progress(
    config: &DeviceConfig, 
    progress_callback: ProgressCallbackArc
) -> Result<Box<dyn sftool_lib::SifliTool>, String> {
    // 解析芯片类型
    let chip_type = match config.chip_type.to_uppercase().as_str() {
        "SF32LB52" => ChipType::SF32LB52,
        "SF32LB56" => ChipType::SF32LB56,
        "SF32LB58" => ChipType::SF32LB58,
        _ => return Err(format!("不支持的芯片型号: {}", config.chip_type)),
    };

    // 创建 SifliToolBase (带进度回调)
    let base = SifliToolBase::new_with_progress(
        config.port_name.clone(),
        Operation::None,
        config.memory_type.to_lowercase(),
        config.baud_rate,
        3,
        false,
        progress_callback,
    );

    // 创建对应的工具实例
    let tool = create_sifli_tool(chip_type, base);
    Ok(tool)
}

#[tauri::command]
fn get_serial_ports() -> Result<Vec<PortInfo>, String> {
    let ports = match serialport::available_ports() {
        Ok(ports) => ports,
        Err(e) => return Err(format!("无法获取串口列表: {}", e)),
    };

    let port_infos = ports
        .into_iter()
        .filter(|p| {
            // 在 macOS 下过滤掉 /dev/tty* 开头的串口，只保留 /dev/cu* 的
            #[cfg(target_os = "macos")]
            {
                if p.port_name.starts_with("/dev/tty") {
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
async fn connect_device(
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
    chip_model: String,
    memory_type: String,
    _interface_type: String,
    port: Option<String>,
    baud_rate: Option<u32>,
) -> Result<bool, String> {
    let device_config = DeviceConfig {
        chip_type: chip_model,
        memory_type,
        port_name: port.ok_or("端口名不能为空")?,
        baud_rate: baud_rate.ok_or("波特率不能为空")?,
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
fn disconnect_device(state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let mut app_state = state.lock().unwrap();
    app_state.device_config = None;
    app_state.sftool = None;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WriteFlashRequest {
    pub files: Vec<WriteFlashFileInfo>,
    pub verify: bool,
    pub no_compress: bool,
    pub erase_all: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WriteFlashFileInfo {
    pub address: u32,
    pub file_path: String,
}

#[tauri::command]
async fn validate_firmware_file(file_path: String) -> Result<bool, String> {
    // 检查文件是否存在
    if !std::path::Path::new(&file_path).exists() {
        return Err(format!("文件不存在: {}", file_path));
    }

    // 检查文件大小是否合理
    match std::fs::metadata(&file_path) {
        Ok(metadata) => {
            let size = metadata.len();
            if size == 0 {
                return Err("文件为空".to_string());
            }
            if size > 100 * 1024 * 1024 {  // 100MB 限制
                return Err("文件过大，可能不是有效的固件文件".to_string());
            }
        }
        Err(e) => return Err(format!("无法读取文件信息: {}", e)),
    }

    // 这里可以添加更多的文件格式验证逻辑
    Ok(true)
}

#[tauri::command]
async fn write_flash(
    state: State<'_, Mutex<AppState>>,
    request: WriteFlashRequest,
) -> Result<(), String> {
    let sftool = {
        let app_state = state.lock().unwrap();
        app_state.sftool.as_ref()
            .ok_or("设备未连接，请先连接设备")?
            .clone()
    };

    // 准备写入文件参数
    let mut files = Vec::new();
    for file_info in request.files {
        // 检查文件是否存在
        if !std::path::Path::new(&file_info.file_path).exists() {
            return Err(format!("文件不存在: {}", file_info.file_path));
        }

        // 根据文件类型和地址构造文件字符串
        let file_string = if file_info.address == 0 {
            // 对于地址为 0 的情况，可能是 ELF/HEX 文件，让 parse_file_info 自动检测
            file_info.file_path.clone()
        } else {
            // 对于指定地址的情况，使用 file@address 格式
            format!("{}@0x{:08X}", file_info.file_path, file_info.address)
        };

        // 使用 Utils::parse_file_info 解析文件
        let parsed_files = Utils::parse_file_info(&file_string)
            .map_err(|e| format!("解析文件 {} 失败: {}", file_info.file_path, e))?;

        files.extend(parsed_files);
    }

    let params = WriteFlashParams {
        files,
        verify: request.verify,
        no_compress: request.no_compress,
        erase_all: request.erase_all,
    };

    let mut tool = sftool.lock().unwrap();
    tool.write_flash(&params)
        .map_err(|e| format!("写入 Flash 失败: {}", e))?;

    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReadFlashRequest {
    pub files: Vec<ReadFlashFileInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReadFlashFileInfo {
    pub file_path: String,
    pub address: u32,
    pub size: u32,
}

#[tauri::command]
async fn read_flash(
    state: State<'_, Mutex<AppState>>,
    request: ReadFlashRequest,
) -> Result<(), String> {
    let sftool = {
        let app_state = state.lock().unwrap();
        app_state.sftool.as_ref()
            .ok_or("设备未连接，请先连接设备")?
            .clone()
    };

    // 准备读取文件参数
    let files = request.files.into_iter().map(|file_info| ReadFlashFile {
        file_path: file_info.file_path,
        address: file_info.address,
        size: file_info.size,
    }).collect();

    let params = ReadFlashParams { files };

    let mut tool = sftool.lock().unwrap();
    tool.read_flash(&params)
        .map_err(|e| format!("读取 Flash 失败: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn erase_flash(
    state: State<'_, Mutex<AppState>>,
    address: u32,
) -> Result<(), String> {
    let sftool = {
        let app_state = state.lock().unwrap();
        app_state.sftool.as_ref()
            .ok_or("设备未连接，请先连接设备")?
            .clone()
    };

    let params = EraseFlashParams { address };

    let mut tool = sftool.lock().unwrap();
    tool.erase_flash(&params)
        .map_err(|e| format!("擦除 Flash 失败: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn set_speed(
    state: State<'_, Mutex<AppState>>,
    baud_rate: u32,
) -> Result<(), String> {
    let sftool = {
        let app_state = state.lock().unwrap();
        app_state.sftool.as_ref()
            .ok_or("设备未连接，请先连接设备")?
            .clone()
    };

    let mut tool = sftool.lock().unwrap();
    tool.set_speed(baud_rate)
        .map_err(|e| format!("设置速度失败: {}", e))?;

    Ok(())
}

#[tauri::command]
async fn soft_reset(
    state: State<'_, Mutex<AppState>>,
) -> Result<(), String> {
    let sftool = {
        let app_state = state.lock().unwrap();
        app_state.sftool.as_ref()
            .ok_or("设备未连接，请先连接设备")?
            .clone()
    };

    let mut tool = sftool.lock().unwrap();
    tool.soft_reset()
        .map_err(|e| format!("软重置失败: {}", e))?;

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
            disconnect_device,
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
