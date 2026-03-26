use crate::state::AppState;
use crate::types::{PortInfo, SerialPortsChangedEvent, UsbInfo};
use futures_lite::{future, StreamExt};
use nusb::hotplug::HotplugEvent;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, Runtime};

pub const SERIAL_PORTS_CHANGED_EVENT: &str = "serial-ports-changed";
const HOTPLUG_SETTLE_DELAY_MS: u64 = 150;
const HOTPLUG_SETTLE_RETRIES: usize = 6;

pub fn list_serial_ports() -> Result<Vec<PortInfo>, String> {
    let ports = serialport::available_ports().map_err(|e| format!("无法获取串口列表: {}", e))?;

    let mut port_infos = ports
        .into_iter()
        .filter(|port| {
            #[cfg(target_os = "macos")]
            {
                if port.port_name.starts_with("/dev/tty") {
                    return false;
                }
            }

            true
        })
        .map(|port| {
            let (port_type, usb_info) = match port.port_type {
                serialport::SerialPortType::UsbPort(info) => (
                    format!("USB ({:04x}:{:04x})", info.vid, info.pid),
                    Some(UsbInfo {
                        vid: info.vid,
                        pid: info.pid,
                        serial_number: info.serial_number,
                        manufacturer: info.manufacturer,
                        product: info.product,
                    }),
                ),
                serialport::SerialPortType::BluetoothPort => ("蓝牙".to_string(), None),
                serialport::SerialPortType::PciPort => ("PCI".to_string(), None),
                serialport::SerialPortType::Unknown => ("未知".to_string(), None),
            };

            PortInfo {
                name: port.port_name,
                port_type,
                usb_info,
            }
        })
        .collect::<Vec<_>>();

    normalize_port_infos(&mut port_infos);
    Ok(port_infos)
}

pub fn spawn_serial_hotplug_watcher<R: Runtime>(app_handle: AppHandle<R>) {
    thread::spawn(move || {
        let Ok(mut watch) = nusb::watch_devices() else {
            eprintln!("Failed to start USB hotplug watcher");
            return;
        };

        let mut last_ports = match list_serial_ports() {
            Ok(ports) => ports,
            Err(error) => {
                eprintln!("{error}");
                Vec::new()
            }
        };

        while let Some(event) = future::block_on(watch.next()) {
            match event {
                HotplugEvent::Connected(_) | HotplugEvent::Disconnected(_) => {
                    if let Err(error) = refresh_ports_after_hotplug(&app_handle, &mut last_ports) {
                        eprintln!("Failed to refresh serial ports after hotplug: {error}");
                    }
                }
            }
        }
    });
}

fn refresh_ports_after_hotplug<R: Runtime>(
    app_handle: &AppHandle<R>,
    last_ports: &mut Vec<PortInfo>,
) -> Result<(), String> {
    let ports = wait_for_settled_ports(last_ports, list_serial_ports)?;
    if *last_ports == ports {
        return Ok(());
    }

    clear_disconnected_device_state(app_handle, &ports);

    app_handle
        .emit(
            SERIAL_PORTS_CHANGED_EVENT,
            SerialPortsChangedEvent {
                ports: ports.clone(),
            },
        )
        .map_err(|e| format!("发送串口列表变化事件失败: {e}"))?;

    *last_ports = ports;
    Ok(())
}

fn wait_for_settled_ports<F>(
    previous_ports: &[PortInfo],
    mut scan_ports: F,
) -> Result<Vec<PortInfo>, String>
where
    F: FnMut() -> Result<Vec<PortInfo>, String>,
{
    let mut current_ports = scan_ports()?;
    let mut changed = current_ports != previous_ports;

    for _ in 0..HOTPLUG_SETTLE_RETRIES {
        thread::sleep(Duration::from_millis(HOTPLUG_SETTLE_DELAY_MS));
        let next_ports = scan_ports()?;
        if next_ports != current_ports {
            current_ports = next_ports;
            changed = true;
            continue;
        }

        if changed {
            break;
        }
    }

    Ok(current_ports)
}

fn clear_disconnected_device_state<R: Runtime>(app_handle: &AppHandle<R>, ports: &[PortInfo]) {
    let app_state_handle = app_handle.state::<Mutex<AppState>>();
    let Ok(mut app_state) = app_state_handle.lock() else {
        return;
    };

    let Some(device_config) = app_state.device_config.as_ref() else {
        return;
    };

    if !serial_port_exists(ports, &device_config.port_name) {
        app_state.clear_device_connection();
    }
}

fn serial_port_exists(ports: &[PortInfo], port_name: &str) -> bool {
    ports.iter().any(|port| port.name == port_name)
}

fn normalize_port_infos(ports: &mut [PortInfo]) {
    ports.sort_by(|left, right| {
        left.name
            .cmp(&right.name)
            .then(left.port_type.cmp(&right.port_type))
    });
}

#[cfg(test)]
mod tests {
    use super::{normalize_port_infos, serial_port_exists, wait_for_settled_ports};
    use crate::types::{PortInfo, UsbInfo};

    fn make_port(name: &str) -> PortInfo {
        PortInfo {
            name: name.to_string(),
            port_type: "USB (1234:5678)".to_string(),
            usb_info: Some(UsbInfo {
                vid: 0x1234,
                pid: 0x5678,
                serial_number: Some("ABC".to_string()),
                manufacturer: Some("SiFli".to_string()),
                product: Some("Board".to_string()),
            }),
        }
    }

    #[test]
    fn normalized_snapshots_compare_equal_even_if_source_order_differs() {
        let mut left = vec![make_port("COM5"), make_port("COM3")];
        let mut right = vec![make_port("COM3"), make_port("COM5")];

        normalize_port_infos(&mut left);
        normalize_port_infos(&mut right);

        assert_eq!(left, right);
    }

    #[test]
    fn reports_connected_port_missing_when_it_disappears() {
        let ports = vec![make_port("COM3"), make_port("COM5")];
        assert!(serial_port_exists(&ports, "COM3"));
        assert!(!serial_port_exists(&ports, "COM7"));
    }

    #[test]
    fn waits_for_delayed_port_removal_after_usb_event() {
        let previous_ports = vec![make_port("COM3"), make_port("COM5")];
        let expected_ports = vec![make_port("COM5")];
        let snapshots = vec![
            previous_ports.clone(),
            previous_ports.clone(),
            expected_ports.clone(),
            expected_ports.clone(),
        ];
        let mut cursor = 0usize;

        let ports = wait_for_settled_ports(&previous_ports, || {
            let snapshot = snapshots
                .get(cursor)
                .cloned()
                .unwrap_or_else(|| snapshots.last().cloned().unwrap());
            cursor += 1;
            Ok(snapshot)
        })
        .unwrap();

        assert_eq!(ports, expected_ports);
    }
}
