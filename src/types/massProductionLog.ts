export type MassProductionPortEventType = 'queued' | 'start' | 'success' | 'error' | 'disconnected';

export interface MassProductionPortLogEvent {
  id: string;
  timestamp: number;
  portName: string;
  type: MassProductionPortEventType;
  message?: string;
  durationMs?: number;
  fileSummary: string[];
}

export interface MassProductionSessionLog {
  sessionId: number;
  startedAt: number;
  endedAt?: number;
  chipModel?: string;
  memoryType?: string;
  autoDownload: boolean;
  maxConcurrency: number;
  total: number;
  success: number;
  failed: number;
  manualStopped: boolean;
  fileSummary: string[];
  portEvents: MassProductionPortLogEvent[];
}
