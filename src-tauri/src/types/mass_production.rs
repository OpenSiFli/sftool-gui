use crate::types::TauriProgressEvent;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MassProductionFilterField {
    VidPid,
    SerialNumber,
    LocationPath,
    PortName,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MassProductionFilterRule {
    pub id: String,
    pub field: MassProductionFilterField,
    pub value: String,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MassProductionPortStatus {
    Idle,
    Queued,
    Flashing,
    Success,
    Error,
    Filtered,
    Disconnected,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MassProductionWriteFileInfo {
    pub address: u32,
    pub file_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MassProductionStartRequest {
    pub chip_model: String,
    pub memory_type: String,
    pub baud_rate: Option<u32>,
    pub stub_path: String,
    pub before_operation: String,
    pub after_operation: String,
    pub files: Vec<MassProductionWriteFileInfo>,
    pub verify: bool,
    pub no_compress: bool,
    pub erase_all: bool,
    pub auto_download: bool,
    pub max_concurrency: u8,
    pub is_filter_enabled: bool,
    pub whitelist: Vec<MassProductionFilterRule>,
    pub blacklist: Vec<MassProductionFilterRule>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MassProductionPortInfo {
    pub id: String,
    pub name: String,
    pub port_type: String,
    pub vid: Option<String>,
    pub pid: Option<String>,
    pub serial_number: Option<String>,
    pub location_path: Option<String>,
    pub chip: Option<String>,
    pub status: MassProductionPortStatus,
    pub progress: u8,
    pub message: Option<String>,
    pub is_allowed: bool,
    pub last_seen_at: u64,
    pub task_started_at: Option<u64>,
    pub task_finished_at: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MassProductionSnapshot {
    pub is_running: bool,
    pub is_enabled: bool,
    pub session_id: u64,
    pub started_at: Option<u64>,
    pub ended_at: Option<u64>,
    pub manual_stopped: bool,
    pub chip_model: Option<String>,
    pub memory_type: Option<String>,
    pub auto_download: bool,
    pub max_concurrency: u8,
    pub queued_count: u32,
    pub active_count: u32,
    pub success_count: u32,
    pub failed_count: u32,
    pub total_count: u32,
    pub ports: Vec<MassProductionPortInfo>,
}

impl Default for MassProductionSnapshot {
    fn default() -> Self {
        Self {
            is_running: false,
            is_enabled: false,
            session_id: 0,
            started_at: None,
            ended_at: None,
            manual_stopped: false,
            chip_model: None,
            memory_type: None,
            auto_download: false,
            max_concurrency: 8,
            queued_count: 0,
            active_count: 0,
            success_count: 0,
            failed_count: 0,
            total_count: 0,
            ports: Vec::new(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MassProductionProgressEvent {
    pub port_name: String,
    pub event: TauriProgressEvent,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MassProductionLogPaths {
    pub settings_path: String,
    pub session_log_path: String,
    pub runtime_log_dir: String,
    pub runtime_log_path: String,
}
