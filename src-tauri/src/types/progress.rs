use serde::{Deserialize, Serialize};

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
