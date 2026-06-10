use chrono::Utc;
use serde::Serialize;
use serde_json::{Map, Value};
use std::fmt;
use std::sync::atomic::{AtomicU64, Ordering};
use tauri::{AppHandle, Emitter, Runtime};
use tracing::field::{Field, Visit};
use tracing::{Event, Level, Subscriber};
use tracing_subscriber::filter::EnvFilter;
use tracing_subscriber::layer::{Context, SubscriberExt};
use tracing_subscriber::util::SubscriberInitExt;
use tracing_subscriber::Layer;

static NEXT_LOG_ID: AtomicU64 = AtomicU64::new(1);

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Trace,
    Debug,
    Info,
    Warning,
    Error,
    Success,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum LogSource {
    Frontend,
    Backend,
    System,
    Progress,
    Tracing,
    MassProduction,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppLogEntry {
    pub id: String,
    pub timestamp: String,
    pub level: LogLevel,
    pub source: LogSource,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub important: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub port: Option<String>,
}

impl AppLogEntry {
    pub fn new(level: LogLevel, source: LogSource, message: impl Into<String>) -> Self {
        let id = NEXT_LOG_ID.fetch_add(1, Ordering::Relaxed);

        Self {
            id: format!("backend-log-{id}"),
            timestamp: Utc::now().to_rfc3339(),
            level,
            source,
            message: message.into(),
            target: None,
            context: None,
            important: None,
            session_id: None,
            port: None,
        }
    }

    pub fn system_error(message: impl Into<String>) -> Self {
        Self::new(LogLevel::Error, LogSource::System, message).important(true)
    }

    pub fn mass_production(level: &str, message: impl Into<String>) -> Self {
        Self::new(
            log_level_from_runtime_level(level),
            LogSource::MassProduction,
            message,
        )
    }

    pub fn important(mut self, important: bool) -> Self {
        self.important = Some(important);
        self
    }

    pub fn with_target(mut self, target: impl Into<String>) -> Self {
        self.target = Some(target.into());
        self
    }

    pub fn with_context(mut self, context: Value) -> Self {
        self.context = Some(context);
        self
    }

    pub fn with_session_id(mut self, session_id: impl ToString) -> Self {
        self.session_id = Some(session_id.to_string());
        self
    }

    pub fn with_port(mut self, port: impl Into<String>) -> Self {
        self.port = Some(port.into());
        self
    }
}

pub fn emit_app_log<R: Runtime>(app_handle: &AppHandle<R>, entry: AppLogEntry) {
    if let Err(error) = app_handle.emit("app-log", &entry) {
        eprintln!("Failed to emit app-log event: {error}");
    }

    if let Err(error) = app_handle.emit("log-message", &entry) {
        eprintln!("Failed to emit legacy log-message event: {error}");
    }
}

pub fn emit_system_log<R: Runtime>(app_handle: &AppHandle<R>, message: impl Into<String>) {
    emit_app_log(
        app_handle,
        AppLogEntry::new(LogLevel::Info, LogSource::System, message),
    );
}

pub fn emit_system_error<R: Runtime>(app_handle: &AppHandle<R>, message: impl Into<String>) {
    emit_app_log(app_handle, AppLogEntry::system_error(message));
}

pub fn initialize_tracing<R: Runtime>(app_handle: AppHandle<R>) {
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("sftool_lib=info,sftool_gui_lib=info,sftool=info"));

    if tracing_subscriber::registry()
        .with(filter)
        .with(TauriLogLayer::new(app_handle))
        .try_init()
        .is_err()
    {
        eprintln!("Tracing subscriber is already initialized");
    }
}

struct TauriLogLayer<R: Runtime> {
    app_handle: AppHandle<R>,
}

impl<R: Runtime> TauriLogLayer<R> {
    fn new(app_handle: AppHandle<R>) -> Self {
        Self { app_handle }
    }
}

impl<S, R> Layer<S> for TauriLogLayer<R>
where
    S: Subscriber,
    R: Runtime,
{
    fn on_event(&self, event: &Event<'_>, _ctx: Context<'_, S>) {
        let metadata = event.metadata();
        if !is_app_tracing_target(metadata.target()) {
            return;
        }

        let mut visitor = TracingFieldVisitor::default();
        event.record(&mut visitor);

        let message = visitor
            .message
            .unwrap_or_else(|| metadata.name().to_string());

        let mut entry = AppLogEntry::new(
            tracing_level_to_log_level(metadata.level()),
            LogSource::Tracing,
            message,
        )
        .with_target(metadata.target().to_string());

        if !visitor.fields.is_empty() {
            entry = entry.with_context(Value::Object(visitor.fields));
        }

        emit_app_log(&self.app_handle, entry);
    }
}

#[derive(Default)]
struct TracingFieldVisitor {
    message: Option<String>,
    fields: Map<String, Value>,
}

impl Visit for TracingFieldVisitor {
    fn record_debug(&mut self, field: &Field, value: &dyn fmt::Debug) {
        let value = format!("{value:?}");
        if field.name() == "message" {
            self.message = Some(value);
        } else {
            self.fields
                .insert(field.name().to_string(), Value::String(value));
        }
    }
}

fn tracing_level_to_log_level(level: &Level) -> LogLevel {
    match *level {
        Level::TRACE => LogLevel::Trace,
        Level::DEBUG => LogLevel::Debug,
        Level::INFO => LogLevel::Info,
        Level::WARN => LogLevel::Warning,
        Level::ERROR => LogLevel::Error,
    }
}

fn log_level_from_runtime_level(level: &str) -> LogLevel {
    match level.to_ascii_uppercase().as_str() {
        "TRACE" => LogLevel::Trace,
        "DEBUG" => LogLevel::Debug,
        "WARN" | "WARNING" => LogLevel::Warning,
        "ERROR" => LogLevel::Error,
        "SUCCESS" => LogLevel::Success,
        _ => LogLevel::Info,
    }
}

fn is_app_tracing_target(target: &str) -> bool {
    target == "sftool_lib"
        || target.starts_with("sftool_lib::")
        || target == "sftool_gui_lib"
        || target.starts_with("sftool_gui_lib::")
        || target == "sftool"
        || target.starts_with("sftool::")
}

#[cfg(test)]
mod tests {
    use super::is_app_tracing_target;

    #[test]
    fn app_tracing_target_filter_keeps_app_and_lib_targets_only() {
        assert!(is_app_tracing_target("sftool_lib::flash"));
        assert!(is_app_tracing_target("sftool_gui_lib::commands::device"));
        assert!(is_app_tracing_target("sftool::commands"));

        assert!(!is_app_tracing_target("tauri::app"));
        assert!(!is_app_tracing_target("wry::webview"));
        assert!(!is_app_tracing_target("hyper"));
    }
}
