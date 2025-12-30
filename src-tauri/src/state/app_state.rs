use crate::types::DeviceConfig;
use sftool_lib::SifliTool;
use std::sync::{Arc, Mutex};

pub struct AppState {
    pub device_config: Option<DeviceConfig>,
    pub sftool: Option<Arc<Mutex<Box<dyn SifliTool>>>>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            device_config: None,
            sftool: None,
        }
    }
}
