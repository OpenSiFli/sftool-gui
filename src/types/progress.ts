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
}

// 操作类型枚举
export enum OperationType {
  ERASE = 'erase',
  DOWNLOAD = 'download', 
  VERIFY = 'verify',
  UNKNOWN = 'unknown'
}

// 进度项状态枚举
export enum ProgressStatus {
  WAITING = 'waiting',
  ACTIVE = 'active', 
  COMPLETED = 'completed',
  ERROR = 'error'
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
  step: string;
  message: string;
  current?: number;
  total?: number;
}

// 消息解析结果接口
export interface MessageParseResult {
  operationType: OperationType;
  address: number | null;
  fileName: string | null;
}
