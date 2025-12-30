use crate::types::TauriProgressEvent;
use sftool_lib::progress::{ProgressCallback, ProgressId, ProgressInfo};
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{AppHandle, Emitter};

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
