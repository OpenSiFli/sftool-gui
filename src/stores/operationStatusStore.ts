import { defineStore } from 'pinia';
import { ref } from 'vue';

export type FlashOperationKind = 'write_flash' | 'read_flash' | 'erase_flash';
export type FlashOperationPhase = 'running' | 'succeeded' | 'failed';

export interface FlashOperationStatus {
  kind: FlashOperationKind;
  phase: FlashOperationPhase;
}

export const useOperationStatusStore = defineStore('operationStatus', () => {
  const currentStatus = ref<FlashOperationStatus | null>(null);

  const markRunning = (kind: FlashOperationKind) => {
    currentStatus.value = { kind, phase: 'running' };
  };

  const markSucceeded = (kind: FlashOperationKind) => {
    currentStatus.value = { kind, phase: 'succeeded' };
  };

  const markFailed = (kind: FlashOperationKind) => {
    currentStatus.value = { kind, phase: 'failed' };
  };

  const clear = () => {
    currentStatus.value = null;
  };

  return {
    currentStatus,
    markRunning,
    markSucceeded,
    markFailed,
    clear,
  };
});
