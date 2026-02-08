use crate::state::MassProductionState;
use crate::types::DeviceConfig;
use sftool_lib::SifliTool;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

pub struct AppState {
    pub device_config: Option<DeviceConfig>,
    pub sftool: Option<Arc<Mutex<Box<dyn SifliTool>>>>,
    pub mass_production: Arc<Mutex<MassProductionState>>,
    /// 临时目录列表，这些目录由后端创建并在应用退出时清理
    pub retained_temp_dirs: Vec<PathBuf>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            device_config: None,
            sftool: None,
            mass_production: Arc::new(Mutex::new(MassProductionState::default())),
            retained_temp_dirs: Vec::new(),
        }
    }
}

impl AppState {
    pub fn register_temp_dir(&mut self, path: PathBuf) {
        self.retained_temp_dirs.push(path);
    }

    pub fn cleanup_temp_dirs(&mut self) {
        for dir in self.retained_temp_dirs.drain(..) {
            let _ = std::fs::remove_dir_all(&dir);
        }
    }
}
