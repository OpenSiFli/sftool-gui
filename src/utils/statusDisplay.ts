import type { FlashOperationStatus } from '../stores/operationStatusStore';
import type { ConnectionIssue } from '../types/device';

export interface ResolveDeviceStatusInput {
  isConnected: boolean;
  isConnecting: boolean;
  connectionIssue: ConnectionIssue | null;
  operation: FlashOperationStatus | null;
  hasHistoricalLogErrors?: boolean;
}

export interface ResolvedDeviceStatus {
  textKey: string;
  className: string;
}

const operationTextKeys: Record<FlashOperationStatus['kind'], Record<FlashOperationStatus['phase'], string>> = {
  write_flash: {
    running: 'deviceConnection.statusText.writeRunning',
    succeeded: 'deviceConnection.statusText.writeSucceeded',
    failed: 'deviceConnection.statusText.writeFailed',
  },
  read_flash: {
    running: 'deviceConnection.statusText.readRunning',
    succeeded: 'deviceConnection.statusText.readSucceeded',
    failed: 'deviceConnection.statusText.readFailed',
  },
  erase_flash: {
    running: 'deviceConnection.statusText.eraseRunning',
    succeeded: 'deviceConnection.statusText.eraseSucceeded',
    failed: 'deviceConnection.statusText.eraseFailed',
  },
};

export const resolveDeviceStatus = (input: ResolveDeviceStatusInput): ResolvedDeviceStatus => {
  if (input.isConnecting) {
    return {
      textKey: 'deviceConnection.statusText.connecting',
      className: 'text-warning font-medium',
    };
  }

  if (input.connectionIssue === 'device_removed') {
    return {
      textKey: 'deviceConnection.statusText.deviceRemoved',
      className: 'text-error font-medium',
    };
  }

  if (input.operation && input.isConnected) {
    return {
      textKey: operationTextKeys[input.operation.kind][input.operation.phase],
      className: input.operation.phase === 'failed' ? 'text-error font-medium' : 'text-success font-medium',
    };
  }

  if (input.isConnected) {
    return {
      textKey: 'deviceConnection.statusText.connected',
      className: 'text-success font-medium',
    };
  }

  return {
    textKey: 'deviceConnection.statusText.disconnected',
    className: 'text-info',
  };
};
