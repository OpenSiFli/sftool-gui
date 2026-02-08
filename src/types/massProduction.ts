import type { ProgressEvent } from './progress';

export type MassProductionFilterField = 'vid_pid' | 'serial_number' | 'location_path' | 'port_name';

export interface MassProductionFilterRule {
  id: string;
  field: MassProductionFilterField;
  value: string;
  enabled: boolean;
}

export type MassProductionPortStatus =
  | 'idle'
  | 'queued'
  | 'flashing'
  | 'success'
  | 'error'
  | 'filtered'
  | 'disconnected';

export interface MassProductionWriteFileInfo {
  address: number;
  file_path: string;
}

export interface MassProductionStartRequest {
  chip_model: string;
  memory_type: string;
  baud_rate?: number;
  stub_path: string;
  before_operation: string;
  after_operation: string;
  files: MassProductionWriteFileInfo[];
  verify: boolean;
  no_compress: boolean;
  erase_all: boolean;
  auto_download: boolean;
  max_concurrency: number;
  is_filter_enabled: boolean;
  whitelist: MassProductionFilterRule[];
  blacklist: MassProductionFilterRule[];
}

export interface MassProductionPortInfo {
  id: string;
  name: string;
  port_type: string;
  vid?: string | null;
  pid?: string | null;
  serial_number?: string | null;
  location_path?: string | null;
  chip?: string | null;
  status: MassProductionPortStatus;
  progress: number;
  message?: string | null;
  is_allowed: boolean;
  last_seen_at: number;
  task_started_at?: number | null;
  task_finished_at?: number | null;
}

export interface MassProductionSnapshot {
  is_running: boolean;
  is_enabled: boolean;
  session_id: number;
  started_at?: number | null;
  ended_at?: number | null;
  manual_stopped: boolean;
  chip_model?: string | null;
  memory_type?: string | null;
  auto_download: boolean;
  max_concurrency: number;
  queued_count: number;
  active_count: number;
  success_count: number;
  failed_count: number;
  total_count: number;
  ports: MassProductionPortInfo[];
}

export interface MassProductionProgressEvent {
  port_name: string;
  event: ProgressEvent;
}

export interface MassProductionLogPaths {
  settings_path: string;
  session_log_path: string;
  runtime_log_dir: string;
  runtime_log_path: string;
}
