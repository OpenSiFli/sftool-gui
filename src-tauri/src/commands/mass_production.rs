use crate::state::{AppState, MassProductionState};
use crate::types::{
    DeviceConfig, MassProductionLogPaths, MassProductionPortInfo, MassProductionPortStatus,
    MassProductionProgressEvent, MassProductionSnapshot, MassProductionStartRequest,
    TauriProgressContext, TauriProgressEvent, TauriProgressOperation, TauriProgressStatus,
    TauriProgressType,
};
use crate::utils::create_tool_instance_with_progress;
use sftool_lib::progress::{ProgressEvent, ProgressSink, ProgressSinkArc};
use sftool_lib::{utils::Utils, WriteFlashParams};
use std::any::Any;
use std::backtrace::Backtrace;
use std::collections::{HashMap, HashSet};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_opener::OpenerExt;

const SCAN_INTERVAL_MS: u64 = 800;

#[derive(Default)]
struct ProgressCounter {
    current: u64,
    total: Option<u64>,
}

struct PortProgressCallback {
    app_handle: AppHandle,
    port_name: String,
    state: Arc<Mutex<MassProductionState>>,
    contexts: Mutex<HashMap<u64, TauriProgressContext>>,
    counters: Mutex<HashMap<u64, ProgressCounter>>,
}

impl PortProgressCallback {
    fn new(
        app_handle: AppHandle,
        port_name: String,
        state: Arc<Mutex<MassProductionState>>,
    ) -> Self {
        Self {
            app_handle,
            port_name,
            state,
            contexts: Mutex::new(HashMap::new()),
            counters: Mutex::new(HashMap::new()),
        }
    }

    fn emit_event(&self, event: TauriProgressEvent) {
        let payload = MassProductionProgressEvent {
            port_name: self.port_name.clone(),
            event,
        };

        if let Err(e) = self.app_handle.emit("mass-production-progress", payload) {
            eprintln!("Failed to emit mass production progress event: {e}");
        }
    }

    fn update_port_progress(&self, progress: u8, message: Option<String>) {
        let mut state = self.state.lock().unwrap();
        if let Some(port) = state.ports.get_mut(&self.port_name) {
            port.progress = progress;
            if let Some(msg) = message {
                port.message = Some(msg);
            }
        }
    }

    fn operation_label(operation: &TauriProgressOperation) -> &'static str {
        match operation {
            TauriProgressOperation::Connect => "Connecting",
            TauriProgressOperation::DownloadStub { .. } => "Downloading stub",
            TauriProgressOperation::EraseFlash { .. } => "Erasing flash",
            TauriProgressOperation::EraseRegion { .. } => "Erasing region",
            TauriProgressOperation::EraseAllRegions => "Erasing all regions",
            TauriProgressOperation::Verify { .. } => "Verifying",
            TauriProgressOperation::CheckRedownload { .. } => "Checking",
            TauriProgressOperation::WriteFlash { .. } => "Flashing",
            TauriProgressOperation::ReadFlash { .. } => "Reading",
            TauriProgressOperation::Unknown => "Processing",
        }
    }
}

impl ProgressSink for PortProgressCallback {
    fn on_event(&self, event: ProgressEvent) {
        match event {
            ProgressEvent::Start { id, ctx } => {
                let current = ctx.current;
                let context = TauriProgressContext::from(ctx);
                let total = total_from_progress_type(&context.progress_type);

                self.contexts.lock().unwrap().insert(id.0, context.clone());
                self.counters.lock().unwrap().insert(
                    id.0,
                    ProgressCounter {
                        current: current.unwrap_or(0),
                        total,
                    },
                );

                if let Some(total) = total {
                    let progress = if total == 0 {
                        0
                    } else {
                        ((current.unwrap_or(0).saturating_mul(100) / total).min(100)) as u8
                    };
                    self.update_port_progress(
                        progress,
                        Some(Self::operation_label(&context.operation).to_string()),
                    );
                } else {
                    self.update_port_progress(
                        0,
                        Some(Self::operation_label(&context.operation).to_string()),
                    );
                }

                self.emit_event(TauriProgressEvent {
                    id: id.0,
                    event_type: "start".to_string(),
                    step: context.step,
                    progress_type: context.progress_type,
                    operation: context.operation,
                    current,
                    total,
                    status: None,
                });
            }
            ProgressEvent::Update { id, ctx } => {
                let context = TauriProgressContext::from(ctx);
                self.contexts.lock().unwrap().insert(id.0, context.clone());

                self.update_port_progress(
                    0,
                    Some(Self::operation_label(&context.operation).to_string()),
                );

                self.emit_event(TauriProgressEvent {
                    id: id.0,
                    event_type: "update".to_string(),
                    step: context.step,
                    progress_type: context.progress_type,
                    operation: context.operation,
                    current: None,
                    total: None,
                    status: None,
                });
            }
            ProgressEvent::Advance { id, delta } => {
                let context = self.contexts.lock().unwrap().get(&id.0).cloned();
                let (step, progress_type, operation) = match context {
                    Some(ctx) => (ctx.step, ctx.progress_type, ctx.operation),
                    None => (
                        0,
                        TauriProgressType::Spinner,
                        TauriProgressOperation::Unknown,
                    ),
                };

                if let Some(counter) = self.counters.lock().unwrap().get_mut(&id.0) {
                    counter.current = counter.current.saturating_add(delta);
                    if let Some(total) = counter.total {
                        if total > 0 {
                            let progress =
                                ((counter.current.saturating_mul(100) / total).min(100)) as u8;
                            self.update_port_progress(progress, None);
                        }
                    }
                }

                self.emit_event(TauriProgressEvent {
                    id: id.0,
                    event_type: "increment".to_string(),
                    step,
                    progress_type,
                    operation,
                    current: Some(delta),
                    total: None,
                    status: None,
                });
            }
            ProgressEvent::Finish { id, status } => {
                let context = self.contexts.lock().unwrap().remove(&id.0);
                self.counters.lock().unwrap().remove(&id.0);

                let (step, progress_type, operation) = match context {
                    Some(ctx) => (ctx.step, ctx.progress_type, ctx.operation),
                    None => (
                        0,
                        TauriProgressType::Spinner,
                        TauriProgressOperation::Unknown,
                    ),
                };

                if matches!(status, sftool_lib::progress::ProgressStatus::Success) {
                    if matches!(operation, TauriProgressOperation::WriteFlash { .. }) {
                        self.update_port_progress(100, Some("Flashing completed".to_string()));
                    }
                }

                self.emit_event(TauriProgressEvent {
                    id: id.0,
                    event_type: "finish".to_string(),
                    step,
                    progress_type,
                    operation,
                    current: None,
                    total: None,
                    status: Some(TauriProgressStatus::from(status)),
                });
            }
        }
    }
}

fn total_from_progress_type(progress_type: &TauriProgressType) -> Option<u64> {
    match progress_type {
        TauriProgressType::Spinner => None,
        TauriProgressType::Bar { total } => Some(*total),
    }
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

const SETTINGS_STORE_FILENAME: &str = "massProduction.json";
const SESSION_LOG_STORE_FILENAME: &str = "massProduction-log.json";
const MASS_PRODUCTION_RUNTIME_LOG_DIRNAME: &str = "logs";
const MASS_PRODUCTION_RUNTIME_LOG_FILENAME: &str = "mass-production-runtime.log";
const MASS_PRODUCTION_PORT_LOG_PREFIX: &str = "mass-production-port";

fn resolve_mass_production_log_paths(
    app_handle: &AppHandle,
) -> Result<MassProductionLogPaths, String> {
    let config_dir = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| format!("获取配置目录失败: {e}"))?;

    let data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取数据目录失败: {e}"))?;

    let runtime_log_dir = data_dir.join(MASS_PRODUCTION_RUNTIME_LOG_DIRNAME);
    let runtime_log_path = runtime_log_dir.join(MASS_PRODUCTION_RUNTIME_LOG_FILENAME);

    Ok(MassProductionLogPaths {
        settings_path: config_dir
            .join(SETTINGS_STORE_FILENAME)
            .to_string_lossy()
            .to_string(),
        session_log_path: config_dir
            .join(SESSION_LOG_STORE_FILENAME)
            .to_string_lossy()
            .to_string(),
        runtime_log_dir: runtime_log_dir.to_string_lossy().to_string(),
        runtime_log_path: runtime_log_path.to_string_lossy().to_string(),
    })
}

fn ensure_runtime_log_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let paths = resolve_mass_production_log_paths(app_handle)?;
    let runtime_log_dir = PathBuf::from(paths.runtime_log_dir);
    fs::create_dir_all(&runtime_log_dir).map_err(|e| format!("创建量产日志目录失败: {e}"))?;
    Ok(PathBuf::from(paths.runtime_log_path))
}

fn sanitize_log_filename_fragment(input: &str) -> String {
    let mut sanitized = String::with_capacity(input.len());
    for ch in input.chars() {
        if ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.') {
            sanitized.push(ch);
        } else {
            sanitized.push('_');
        }
    }

    let trimmed = sanitized.trim_matches('_');
    if trimmed.is_empty() {
        return "unknown-port".to_string();
    }

    trimmed.chars().take(80).collect()
}

fn ensure_port_runtime_log_path(
    app_handle: &AppHandle,
    session_id: u64,
    port_name: &str,
) -> Result<PathBuf, String> {
    let paths = resolve_mass_production_log_paths(app_handle)?;
    let runtime_log_dir = PathBuf::from(paths.runtime_log_dir);
    fs::create_dir_all(&runtime_log_dir).map_err(|e| format!("创建量产日志目录失败: {e}"))?;

    let sanitized_port_name = sanitize_log_filename_fragment(port_name);
    let file_name =
        format!("{MASS_PRODUCTION_PORT_LOG_PREFIX}-session-{session_id}-{sanitized_port_name}.log");

    Ok(runtime_log_dir.join(file_name))
}

fn append_log_line(log_path: &PathBuf, level: &str, message: &str) -> Result<(), String> {
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| format!("打开日志文件失败: {e}; path={}", log_path.display()))?;

    let formatted_message = message.replace('\r', "");
    let log_line = format!("[{}][{}] {}\n", now_millis(), level, formatted_message);
    file.write_all(log_line.as_bytes())
        .map_err(|e| format!("写入日志失败: {e}; path={}", log_path.display()))
}

fn ensure_log_file_exists(log_path: &PathBuf) -> Result<(), String> {
    if log_path.exists() {
        return Ok(());
    }

    OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
        .map_err(|e| format!("初始化日志文件失败: {e}; path={}", log_path.display()))?;

    Ok(())
}
fn append_mass_runtime_log(app_handle: &AppHandle, level: &str, message: &str) {
    let runtime_log_path = match ensure_runtime_log_path(app_handle) {
        Ok(path) => path,
        Err(error) => {
            eprintln!("[mass-production][log][{level}] {message}");
            eprintln!("[mass-production][log] {error}");
            return;
        }
    };

    if let Err(error) = append_log_line(&runtime_log_path, level, message) {
        eprintln!("[mass-production][log] {error}");
    }
}

fn append_mass_port_runtime_log(
    app_handle: &AppHandle,
    session_id: u64,
    port_name: &str,
    level: &str,
    message: &str,
) {
    let port_log_path = match ensure_port_runtime_log_path(app_handle, session_id, port_name) {
        Ok(path) => path,
        Err(error) => {
            eprintln!("[mass-production][{port_name}][{level}] {message}");
            eprintln!("[mass-production][{port_name}] {error}");
            return;
        }
    };

    if let Err(error) = append_log_line(&port_log_path, level, message) {
        eprintln!("[mass-production][{port_name}] {error}");
    }
}

fn append_mass_worker_runtime_log(
    app_handle: &AppHandle,
    session_id: u64,
    port_name: &str,
    level: &str,
    message: &str,
) {
    append_mass_runtime_log(
        app_handle,
        level,
        &format!("session_id={session_id} port={port_name} {message}"),
    );
    append_mass_port_runtime_log(app_handle, session_id, port_name, level, message);
}
fn panic_payload_summary(payload: &(dyn Any + Send)) -> String {
    if let Some(message) = payload.downcast_ref::<String>() {
        return message.clone();
    }

    if let Some(message) = payload.downcast_ref::<&str>() {
        return (*message).to_string();
    }

    if payload.is::<()>() {
        return "panic payload is unit type ()".to_string();
    }

    "panic payload is non-string type".to_string()
}

fn panic_payload_details(payload: &(dyn Any + Send)) -> String {
    let summary = panic_payload_summary(payload);
    let backtrace = Backtrace::force_capture();
    format!("panic_summary={summary}; backtrace={backtrace}")
}

fn sanitize_request(
    mut request: MassProductionStartRequest,
) -> Result<MassProductionStartRequest, String> {
    if request.files.is_empty() {
        return Err("未配置固件文件，无法启动量产".to_string());
    }

    request.max_concurrency = request.max_concurrency.clamp(1, 32);

    for file in &request.files {
        if !std::path::Path::new(&file.file_path).exists() {
            return Err(format!("文件不存在: {}", file.file_path));
        }
    }

    Ok(request)
}

fn is_port_allowed(port: &MassProductionPortInfo, request: &MassProductionStartRequest) -> bool {
    if !request.is_filter_enabled {
        return true;
    }

    let match_rule = |rule: &crate::types::MassProductionFilterRule| -> bool {
        if !rule.enabled || rule.value.trim().is_empty() {
            return false;
        }

        let value = rule.value.to_lowercase();

        match rule.field {
            crate::types::MassProductionFilterField::VidPid => {
                let vid = port.vid.clone().unwrap_or_default().to_lowercase();
                let pid = port.pid.clone().unwrap_or_default().to_lowercase();
                vid.contains(&value)
                    || pid.contains(&value)
                    || format!("{vid}:{pid}").contains(&value)
            }
            crate::types::MassProductionFilterField::SerialNumber => port
                .serial_number
                .clone()
                .unwrap_or_default()
                .to_lowercase()
                .contains(&value),
            crate::types::MassProductionFilterField::LocationPath => port
                .location_path
                .clone()
                .unwrap_or_default()
                .to_lowercase()
                .contains(&value),
            crate::types::MassProductionFilterField::PortName => {
                port.name.to_lowercase().contains(&value)
            }
        }
    };

    let active_whitelist: Vec<_> = request.whitelist.iter().filter(|r| r.enabled).collect();
    if !active_whitelist.is_empty() && !active_whitelist.into_iter().any(match_rule) {
        return false;
    }

    if request
        .blacklist
        .iter()
        .filter(|r| r.enabled)
        .any(match_rule)
    {
        return false;
    }

    true
}

fn enumerate_ports() -> Result<Vec<MassProductionPortInfo>, String> {
    let ports = serialport::available_ports().map_err(|e| format!("无法获取串口列表: {e}"))?;

    let mut result = Vec::new();

    for p in ports {
        #[cfg(target_os = "macos")]
        if p.port_name.starts_with("/dev/tty") {
            continue;
        }

        let mut vid: Option<String> = None;
        let mut pid: Option<String> = None;
        let mut serial_number: Option<String> = None;
        let mut location_path: Option<String> = None;

        let port_type = match p.port_type {
            serialport::SerialPortType::UsbPort(info) => {
                vid = Some(format!("{:04X}", info.vid));
                pid = Some(format!("{:04X}", info.pid));
                serial_number = info.serial_number.clone();
                location_path = Some(p.port_name.clone());
                format!("USB ({:04X}:{:04X})", info.vid, info.pid)
            }
            serialport::SerialPortType::BluetoothPort => "蓝牙".to_string(),
            serialport::SerialPortType::PciPort => "PCI".to_string(),
            serialport::SerialPortType::Unknown => "未知".to_string(),
        };

        result.push(MassProductionPortInfo {
            id: p.port_name.clone(),
            name: p.port_name.clone(),
            port_type,
            vid,
            pid,
            serial_number,
            location_path,
            chip: None,
            status: MassProductionPortStatus::Idle,
            progress: 0,
            message: None,
            is_allowed: true,
            last_seen_at: now_millis(),
            task_started_at: None,
            task_finished_at: None,
        });
    }

    Ok(result)
}

fn emit_snapshot(app_handle: &AppHandle, snapshot: &MassProductionSnapshot) {
    if let Err(e) = app_handle.emit("mass-production-snapshot", snapshot.clone()) {
        eprintln!("Failed to emit mass production snapshot: {e}");
    }
}

fn queue_port(state: &mut MassProductionState, port_name: &str, now: u64) {
    if state.active_ports.contains(port_name) || state.queue.contains(&port_name.to_string()) {
        return;
    }

    if let Some(port) = state.ports.get_mut(port_name) {
        if port.status == MassProductionPortStatus::Idle {
            port.status = MassProductionPortStatus::Queued;
            port.message = Some("Queued".to_string());
            port.task_started_at = Some(now);
            port.task_finished_at = None;
            state.queue.push_back(port_name.to_string());
        }
    }
}

fn scan_ports(state: &mut MassProductionState, trigger_flash: bool) -> Result<(), String> {
    let scanned_ports = enumerate_ports()?;
    let now = now_millis();

    let mut seen: HashSet<String> = HashSet::new();
    for mut scanned in scanned_ports {
        let name = scanned.name.clone();
        seen.insert(name.clone());

        let allowed = state
            .request
            .as_ref()
            .map(|req| is_port_allowed(&scanned, req))
            .unwrap_or(true);

        scanned.chip = state.request.as_ref().map(|req| req.chip_model.clone());
        scanned.is_allowed = allowed;

        if let Some(existing) = state.ports.get_mut(&name) {
            existing.port_type = scanned.port_type;
            existing.vid = scanned.vid;
            existing.pid = scanned.pid;
            existing.serial_number = scanned.serial_number;
            existing.location_path = scanned.location_path;
            existing.last_seen_at = now;
            existing.is_allowed = allowed;

            if !allowed {
                if !state.active_ports.contains(&name) {
                    existing.status = MassProductionPortStatus::Filtered;
                    existing.progress = 0;
                    existing.message = Some("Filtered".to_string());
                    state.queue.retain(|p| p != &name);
                }
                continue;
            }

            if matches!(
                existing.status,
                MassProductionPortStatus::Filtered | MassProductionPortStatus::Disconnected
            ) {
                existing.status = MassProductionPortStatus::Idle;
                existing.progress = 0;
                existing.message = Some("Ready".to_string());
                existing.task_started_at = None;
                existing.task_finished_at = None;
            }

            let should_queue = if let Some(request) = &state.request {
                state.running
                    && (request.auto_download || trigger_flash || state.pending_trigger_flash)
            } else {
                false
            };

            if should_queue {
                queue_port(state, &name, now);
            }

            continue;
        }

        let mut new_port = scanned;
        if !allowed {
            new_port.status = MassProductionPortStatus::Filtered;
            new_port.message = Some("Filtered".to_string());
        } else {
            new_port.status = MassProductionPortStatus::Idle;
            new_port.message = Some("Ready".to_string());
        }

        state.ports.insert(name.clone(), new_port);

        let should_queue = if let Some(request) = &state.request {
            state.running && (request.auto_download || trigger_flash || state.pending_trigger_flash)
        } else {
            false
        };

        if should_queue && allowed {
            queue_port(state, &name, now);
        }
    }

    let existing_ports: Vec<String> = state.ports.keys().cloned().collect();
    for port_name in existing_ports {
        if seen.contains(&port_name) || state.active_ports.contains(&port_name) {
            continue;
        }

        state.queue.retain(|queued| queued != &port_name);

        if let Some(port) = state.ports.get_mut(&port_name) {
            if port.status != MassProductionPortStatus::Disconnected {
                port.status = MassProductionPortStatus::Disconnected;
                port.progress = 0;
                port.message = Some("Device disconnected".to_string());
                port.task_finished_at = Some(now);
            }
            port.is_allowed = false;
        }
    }

    state.pending_trigger_flash = false;
    Ok(())
}

fn build_write_flash_params(
    request: &MassProductionStartRequest,
) -> Result<WriteFlashParams, String> {
    let mut files = Vec::new();

    for file_info in &request.files {
        let file_string = if file_info.address == 0 {
            file_info.file_path.clone()
        } else {
            format!("{}@0x{:08X}", file_info.file_path, file_info.address)
        };

        let parsed_files = Utils::parse_file_info(&file_string)
            .map_err(|e| format!("解析文件 {} 失败: {e}", file_info.file_path))?;

        files.extend(parsed_files);
    }

    Ok(WriteFlashParams {
        files,
        verify: request.verify,
        no_compress: request.no_compress,
        erase_all: request.erase_all,
    })
}

fn run_worker(
    app_handle: AppHandle,
    state: Arc<Mutex<MassProductionState>>,
    request: MassProductionStartRequest,
    port_name: String,
    session_id: u64,
) {
    let now = now_millis();

    {
        let mut locked = state.lock().unwrap();
        if locked.session_id != session_id {
            locked.active_ports.remove(&port_name);
            return;
        }

        if let Some(port) = locked.ports.get_mut(&port_name) {
            port.status = MassProductionPortStatus::Flashing;
            port.progress = 0;
            port.message = Some("Flashing".to_string());
            port.task_started_at = Some(now);
            port.task_finished_at = None;
        }
    }

    let progress_callback: ProgressSinkArc = Arc::new(PortProgressCallback::new(
        app_handle.clone(),
        port_name.clone(),
        state.clone(),
    ));

    append_mass_worker_runtime_log(
        &app_handle,
        session_id,
        &port_name,
        "INFO",
        "worker started",
    );

    let port_name_for_panic = port_name.clone();
    let result: Result<(), String> = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        let device_config = DeviceConfig {
            chip_type: request.chip_model.clone(),
            memory_type: request.memory_type.clone(),
            port_name: port_name.clone(),
            baud_rate: request.baud_rate.unwrap_or(1_000_000),
            stub_path: request.stub_path.clone(),
            before_operation: request.before_operation.clone(),
            after_operation: request.after_operation.clone(),
        };

        let mut tool = create_tool_instance_with_progress(&device_config, progress_callback)?;
        let params = build_write_flash_params(&request)?;
        tool.write_flash(&params)
            .map_err(|e| format!("写入 Flash 失败: {e}"))?;

        Ok(())
    }))
    .map_err(|panic_payload| {
        let summary = panic_payload_summary(panic_payload.as_ref());
        let details = panic_payload_details(panic_payload.as_ref());
        append_mass_worker_runtime_log(
            &app_handle,
            session_id,
            &port_name_for_panic,
            "ERROR",
            &format!("uncaught panic: {details}"),
        );
        format!("量产任务发生未捕获异常: {summary}")
    })
    .and_then(|result| result);

    match &result {
        Ok(()) => append_mass_worker_runtime_log(
            &app_handle,
            session_id,
            &port_name,
            "INFO",
            "worker finished successfully",
        ),
        Err(error) => append_mass_worker_runtime_log(
            &app_handle,
            session_id,
            &port_name,
            "ERROR",
            &format!("worker failed: {error}"),
        ),
    }

    {
        let mut locked = state.lock().unwrap();
        if locked.session_id != session_id {
            locked.active_ports.remove(&port_name);
            return;
        }

        locked.active_ports.remove(&port_name);

        let finished_at = now_millis();
        let is_success = result.is_ok();

        if is_success {
            locked.success_count = locked.success_count.saturating_add(1);
        } else {
            locked.failed_count = locked.failed_count.saturating_add(1);
        }

        if let Some(port) = locked.ports.get_mut(&port_name) {
            port.task_finished_at = Some(finished_at);

            if is_success {
                port.status = MassProductionPortStatus::Success;
                port.progress = 100;
                port.message = Some("Completed".to_string());
            } else if let Err(e) = &result {
                port.status = MassProductionPortStatus::Error;
                port.message = Some(e.clone());
            }
        }

        if !locked.running && locked.active_ports.is_empty() {
            locked.ended_at = Some(finished_at);
        }
    }

    let snapshot = { state.lock().unwrap().to_snapshot() };
    emit_snapshot(&app_handle, &snapshot);
}

fn dispatch_workers(app_handle: &AppHandle, state: &Arc<Mutex<MassProductionState>>) {
    let mut tasks: Vec<(String, MassProductionStartRequest, u64)> = Vec::new();

    {
        let mut locked = state.lock().unwrap();
        let Some(request) = locked.request.clone() else {
            return;
        };

        if !locked.running {
            return;
        }

        let max_concurrency = request.max_concurrency.clamp(1, 32) as usize;
        while locked.active_ports.len() < max_concurrency {
            let Some(port_name) = locked.queue.pop_front() else {
                break;
            };

            if locked.active_ports.contains(&port_name) {
                continue;
            }

            let Some(port) = locked.ports.get(&port_name) else {
                continue;
            };

            if !port.is_allowed || port.status != MassProductionPortStatus::Queued {
                continue;
            }

            locked.active_ports.insert(port_name.clone());
            tasks.push((port_name, request.clone(), locked.session_id));
        }
    }

    for (port_name, request, session_id) in tasks {
        let app_handle_clone = app_handle.clone();
        let state_clone = state.clone();
        thread::spawn(move || {
            run_worker(
                app_handle_clone,
                state_clone,
                request,
                port_name,
                session_id,
            )
        });
    }
}

fn supervisor_loop(app_handle: AppHandle, state: Arc<Mutex<MassProductionState>>) {
    loop {
        let should_continue = { state.lock().unwrap().running };
        if !should_continue {
            break;
        }

        if let Err(e) = {
            let mut locked = state.lock().unwrap();
            scan_ports(&mut locked, false)
        } {
            append_mass_runtime_log(
                &app_handle,
                "ERROR",
                &format!("supervisor scan failed: {e}"),
            );
            eprintln!("Mass production scan failed: {e}");
        }

        dispatch_workers(&app_handle, &state);

        let snapshot = { state.lock().unwrap().to_snapshot() };
        emit_snapshot(&app_handle, &snapshot);

        thread::sleep(Duration::from_millis(SCAN_INTERVAL_MS));
    }

    {
        let mut locked = state.lock().unwrap();
        if locked.active_ports.is_empty() {
            locked.ended_at = Some(now_millis());
        }
    }

    let snapshot = { state.lock().unwrap().to_snapshot() };
    emit_snapshot(&app_handle, &snapshot);
}

fn with_mass_state(
    state: &State<'_, Mutex<AppState>>,
) -> Result<Arc<Mutex<MassProductionState>>, String> {
    let app_state = state.lock().map_err(|e| format!("获取应用状态失败: {e}"))?;
    Ok(app_state.mass_production.clone())
}

#[tauri::command]
pub async fn mass_production_start(
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
    request: MassProductionStartRequest,
) -> Result<MassProductionSnapshot, String> {
    let request = sanitize_request(request)?;
    append_mass_runtime_log(
        &app_handle,
        "INFO",
        &format!(
            "start requested: chip_model={} memory_type={} files={} auto_download={} max_concurrency={}",
            request.chip_model,
            request.memory_type,
            request.files.len(),
            request.auto_download,
            request.max_concurrency
        ),
    );

    let mass_state = with_mass_state(&state)?;

    {
        let mut locked = mass_state.lock().unwrap();
        if locked.running {
            return Err("量产任务正在运行，请先停止当前任务".to_string());
        }

        if !locked.active_ports.is_empty() {
            return Err("仍有端口任务在执行，请稍后再启动新的量产会话".to_string());
        }

        if let Some(handle) = locked.supervisor_thread.take() {
            let _ = handle.join();
        }

        let session_id = locked.session_id.saturating_add(1);
        locked.reset_for_start(request.clone(), session_id, now_millis());

        scan_ports(&mut locked, true)?;
    }

    dispatch_workers(&app_handle, &mass_state);

    let state_for_thread = mass_state.clone();
    let app_handle_for_thread = app_handle.clone();
    let handle = thread::spawn(move || supervisor_loop(app_handle_for_thread, state_for_thread));

    {
        let mut locked = mass_state.lock().unwrap();
        locked.supervisor_thread = Some(handle);
    }

    let snapshot = { mass_state.lock().unwrap().to_snapshot() };
    emit_snapshot(&app_handle, &snapshot);
    Ok(snapshot)
}

#[tauri::command]
pub async fn mass_production_stop(
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
) -> Result<MassProductionSnapshot, String> {
    append_mass_runtime_log(&app_handle, "INFO", "stop requested");
    let mass_state = with_mass_state(&state)?;

    let handle = {
        let mut locked = mass_state.lock().unwrap();
        locked.running = false;
        locked.manual_stopped = true;
        locked.pending_trigger_flash = false;
        locked.queue.clear();
        if locked.active_ports.is_empty() {
            locked.ended_at = Some(now_millis());
        }
        locked.supervisor_thread.take()
    };

    if let Some(join_handle) = handle {
        let _ = join_handle.join();
    }

    let snapshot = { mass_state.lock().unwrap().to_snapshot() };
    emit_snapshot(&app_handle, &snapshot);
    Ok(snapshot)
}

#[tauri::command]
pub async fn mass_production_refresh(
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
    trigger_flash: bool,
) -> Result<MassProductionSnapshot, String> {
    append_mass_runtime_log(
        &app_handle,
        "INFO",
        &format!("refresh requested: trigger_flash={trigger_flash}"),
    );

    let mass_state = with_mass_state(&state)?;

    {
        let mut locked = mass_state.lock().unwrap();
        if trigger_flash {
            locked.pending_trigger_flash = true;
        }
        scan_ports(&mut locked, trigger_flash)?;
    }

    dispatch_workers(&app_handle, &mass_state);

    let snapshot = { mass_state.lock().unwrap().to_snapshot() };
    emit_snapshot(&app_handle, &snapshot);
    Ok(snapshot)
}

#[tauri::command]
pub async fn mass_production_set_auto_download(
    app_handle: AppHandle,
    state: State<'_, Mutex<AppState>>,
    auto_download: bool,
) -> Result<MassProductionSnapshot, String> {
    append_mass_runtime_log(
        &app_handle,
        "INFO",
        &format!("set auto_download requested: auto_download={auto_download}"),
    );

    let mass_state = with_mass_state(&state)?;

    {
        let mut locked = mass_state.lock().unwrap();
        let Some(request) = locked.request.as_mut() else {
            return Err("量产任务未初始化，无法更新插入自动下载配置".to_string());
        };

        request.auto_download = auto_download;

        if locked.running && !auto_download {
            let queued_ports: Vec<String> = locked.queue.drain(..).collect();
            for port_name in queued_ports {
                if let Some(port) = locked.ports.get_mut(&port_name) {
                    if port.status == MassProductionPortStatus::Queued {
                        port.status = MassProductionPortStatus::Idle;
                        port.progress = 0;
                        port.message = Some("Ready".to_string());
                        port.task_started_at = None;
                        port.task_finished_at = None;
                    }
                }
            }
        }

        scan_ports(&mut locked, false)?;
    }

    dispatch_workers(&app_handle, &mass_state);

    let snapshot = { mass_state.lock().unwrap().to_snapshot() };
    emit_snapshot(&app_handle, &snapshot);
    Ok(snapshot)
}

#[tauri::command]
pub async fn mass_production_get_snapshot(
    state: State<'_, Mutex<AppState>>,
) -> Result<MassProductionSnapshot, String> {
    let mass_state = with_mass_state(&state)?;
    let snapshot = { mass_state.lock().unwrap().to_snapshot() };
    Ok(snapshot)
}

#[tauri::command]
pub async fn mass_production_get_log_paths(
    app_handle: AppHandle,
) -> Result<MassProductionLogPaths, String> {
    let log_paths = resolve_mass_production_log_paths(&app_handle)?;

    let runtime_log_dir = PathBuf::from(&log_paths.runtime_log_dir);
    fs::create_dir_all(&runtime_log_dir).map_err(|e| format!("创建量产日志目录失败: {e}"))?;

    let runtime_log_path = PathBuf::from(&log_paths.runtime_log_path);
    ensure_log_file_exists(&runtime_log_path)?;

    Ok(log_paths)
}
#[tauri::command]
pub async fn mass_production_open_port_log(
    app_handle: AppHandle,
    session_id: u64,
    port_name: String,
) -> Result<String, String> {
    let port_log_path = ensure_port_runtime_log_path(&app_handle, session_id, &port_name)?;
    ensure_log_file_exists(&port_log_path)?;

    app_handle
        .opener()
        .open_path(port_log_path.to_string_lossy().to_string(), None::<&str>)
        .map_err(|e| format!("打开端口日志文件失败: {e}"))?;

    Ok(port_log_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn mass_production_open_log_directory(app_handle: AppHandle) -> Result<(), String> {
    let log_paths = mass_production_get_log_paths(app_handle.clone()).await?;

    app_handle
        .opener()
        .open_path(log_paths.runtime_log_dir, None::<&str>)
        .map_err(|e| format!("打开量产日志目录失败: {e}"))?;

    Ok(())
}
