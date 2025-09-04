use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct PortInfo {
    pub name: String,
    pub port_type: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceConfig {
    pub chip_type: String,
    pub memory_type: String,
    pub port_name: String,
    pub baud_rate: u32,
}
