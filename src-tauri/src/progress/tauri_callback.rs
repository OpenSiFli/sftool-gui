use crate::types::{
    TauriProgressContext, TauriProgressEvent, TauriProgressOperation, TauriProgressStatus,
    TauriProgressType,
};
use sftool_lib::progress::{ProgressEvent, ProgressSink};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

// Tauri 进度回调实现
pub struct TauriProgressCallback {
    app_handle: AppHandle,
    contexts: Mutex<HashMap<u64, TauriProgressContext>>,
}

impl TauriProgressCallback {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            contexts: Mutex::new(HashMap::new()),
        }
    }

    fn emit_event(&self, event: TauriProgressEvent) {
        if let Err(e) = self.app_handle.emit("flash-progress", &event) {
            eprintln!("Failed to emit progress event: {}", e);
        }
    }
}

impl ProgressSink for TauriProgressCallback {
    fn on_event(&self, event: ProgressEvent) {
        match event {
            ProgressEvent::Start { id, ctx } => {
                let current = ctx.current;
                let context = TauriProgressContext::from(ctx);
                let total = total_from_progress_type(&context.progress_type);
                self.contexts.lock().unwrap().insert(id.0, context.clone());

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
                let (step, progress_type, operation) = match context {
                    Some(ctx) => (ctx.step, ctx.progress_type, ctx.operation),
                    None => (
                        0,
                        TauriProgressType::Spinner,
                        TauriProgressOperation::Unknown,
                    ),
                };

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
