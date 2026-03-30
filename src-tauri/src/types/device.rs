use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct UsbInfo {
    pub vid: u16,
    pub pid: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub serial_number: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub manufacturer: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub product: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct PortInfo {
    pub name: String,
    pub port_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usb_info: Option<UsbInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SerialPortsChangedEvent {
    pub ports: Vec<PortInfo>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DeviceConfig {
    pub chip_type: String,
    pub memory_type: String,
    pub port_name: String,
    pub baud_rate: u32,
    pub stub_path: String,
    // use String for serde-friendly transport; parse to enums internally when needed
    pub before_operation: String,
    pub after_operation: String,
}
