export interface UsbInfo {
  vid: number;
  pid: number;
  serial_number?: string | null;
  manufacturer?: string | null;
  product?: string | null;
}

export interface PortInfo {
  name: string;
  port_type: string;
  usb_info?: UsbInfo | null;
}

export interface SerialPortsChangedEvent {
  ports: PortInfo[];
}

export type ConnectionIssue = 'device_removed' | 'device_recovered';

export const usbIdentityKey = (usbInfo?: UsbInfo | null): string | null => {
  if (!usbInfo) {
    return null;
  }

  return JSON.stringify({
    vid: usbInfo.vid,
    pid: usbInfo.pid,
    serial_number: usbInfo.serial_number ?? null,
    manufacturer: usbInfo.manufacturer ?? null,
    product: usbInfo.product ?? null,
  });
};

export const isPortAvailable = (selectedPort: PortInfo | null, ports: PortInfo[]): boolean => {
  if (!selectedPort) {
    return false;
  }

  return ports.some(port => port.name === selectedPort.name);
};

export const findMatchingPort = (selectedPort: PortInfo | null, ports: PortInfo[]): PortInfo | null => {
  if (!selectedPort) {
    return null;
  }

  const matchedByName = ports.find(port => port.name === selectedPort.name);
  if (matchedByName) {
    return matchedByName;
  }

  const selectedUsbIdentity = usbIdentityKey(selectedPort.usb_info);
  if (!selectedUsbIdentity) {
    return null;
  }

  const matchedByUsbIdentity = ports.filter(port => usbIdentityKey(port.usb_info) === selectedUsbIdentity);
  return matchedByUsbIdentity.length === 1 ? matchedByUsbIdentity[0] : null;
};
