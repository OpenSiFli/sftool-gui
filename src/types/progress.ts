/**
 * 进度事件相关类型定义
 */

// 文件类型定义
export interface FlashFile {
  id: string;
  name: string;
  path: string;
  address?: string;
  addressError?: string;
  size?: number;
  collapsed?: boolean;
}

// 操作类型枚举
export enum OperationType {
  ERASE = 'erase',
  DOWNLOAD = 'download',
  VERIFY = 'verify',
  READ = 'read',
  CONNECT = 'connect',
  DOWNLOAD_STUB = 'download_stub',
  CHECK = 'check',
  UNKNOWN = 'unknown',
}

export type ProgressType = { kind: 'spinner' } | { kind: 'bar'; total: number };

export type StubStage = 'start' | 'signature_key' | 'ram_stub';

export type EraseFlashStyle = 'complete' | 'addressed';

export type EraseRegionStyle = 'legacy_flash_start_decimal_length' | 'hex_length' | 'range';

export type ProgressOperation =
  | { kind: 'connect' }
  | { kind: 'download_stub'; stage: StubStage }
  | { kind: 'erase_flash'; address: number; style: EraseFlashStyle }
  | { kind: 'erase_region'; address: number; len: number; style: EraseRegionStyle }
  | { kind: 'erase_all_regions' }
  | { kind: 'verify'; address: number; len: number }
  | { kind: 'check_redownload'; address: number; size: number }
  | { kind: 'write_flash'; address: number; size: number }
  | { kind: 'read_flash'; address: number; size: number }
  | { kind: 'unknown' };

export type ProgressFinishStatus =
  | { kind: 'success' }
  | { kind: 'retry' }
  | { kind: 'skipped' }
  | { kind: 'required' }
  | { kind: 'not_found' }
  | { kind: 'failed'; message: string }
  | { kind: 'aborted' };

// 进度项状态枚举
export enum ProgressStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ERROR = 'error',
}

// 进度项接口
export interface ProgressItem {
  step: string;
  message: string;
  current?: number;
  total?: number;
  startTime?: number;
  lastUpdateTime?: number;
  speed?: number;
  eta?: number;
  percentage: number;
  fileName: string;
  address: number;
  status: ProgressStatus;
  operationType?: OperationType;
}

// 总进度状态接口
export interface TotalProgress {
  current: number;
  total: number;
  percentage: number;
  speed: number;
  eta: number;
  currentFileName: string;
  completedCount: number;
  totalCount: number;
  isCompleted?: boolean;
}

// 进度事件接口
export interface ProgressEvent {
  id: number;
  event_type: 'start' | 'update' | 'increment' | 'finish';
  step: number;
  progress_type: ProgressType;
  operation: ProgressOperation;
  current?: number;
  total?: number;
  status?: ProgressFinishStatus;
}

// 消息解析结果接口
export interface MessageParseResult {
  operationType: OperationType;
  address: number | null;
  fileName: string | null;
}
