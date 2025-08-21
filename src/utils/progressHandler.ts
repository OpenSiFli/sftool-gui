import { useLogStore } from '../stores/logStore';
import { MessageParser } from './messageParser';
import { 
  OperationType, 
  ProgressStatus,
  type ProgressEvent, 
  type ProgressItem
} from '../types/progress';

// 导入 writeFlashStore 类型
import type { useWriteFlashStore } from '../stores/writeFlashStore';

/**
 * 进度处理器类 - 负责处理所有进度相关的逻辑
 * 使用 Store 方式
 */
export class ProgressHandler {
  private logStore = useLogStore();
  private store: ReturnType<typeof useWriteFlashStore>;
  
  constructor(store: ReturnType<typeof useWriteFlashStore>) {
    this.store = store;
  }
  
  /**
   * 处理进度事件
   */
  handleEvent(event: ProgressEvent): void {
    switch (event.event_type) {
      case 'start':
        this.handleStartEvent(event);
        break;
      case 'update':
        this.handleUpdateEvent(event);
        break;
      case 'increment':
        this.handleIncrementEvent(event);
        break;
      case 'finish':
        this.handleFinishEvent(event);
        break;
    }
  }

  /**
   * 处理开始事件
   */
  private handleStartEvent(event: ProgressEvent): void {
    const { id, step, message, current, total } = event;
    const now = Date.now();
    
    const parsed = MessageParser.parseMessage(message, this.store.selectedFiles);
    let fileName = parsed.fileName;
    
    // 如果没有解析出文件名，使用默认逻辑
    if (!fileName && this.store.selectedFiles.length > 0) {
      fileName = this.store.selectedFiles[0].name;
    }
    
    // 更新当前操作状态
    this.updateCurrentOperation(parsed.operationType, fileName || undefined);
    
    // 更新总进度状态（仅对下载操作）
    if (parsed.operationType === OperationType.DOWNLOAD && fileName) {
      this.updateTotalProgress(fileName, total);
    }
    
    // 创建进度项
    this.createProgressItem(id, {
      step,
      message,
      current,
      total,
      startTime: now,
      fileName: fileName || `操作 ${id}`,
      address: parsed.address || 0,
      operationType: parsed.operationType
    });
    
    // 记录日志
    const logFileName = parsed.operationType === OperationType.DOWNLOAD 
      ? (fileName || '文件') 
      : MessageParser.getOperationName(parsed.operationType);
    this.logStore.addMessage(`[${logFileName}] ${message}`);
  }

  /**
   * 处理更新事件
   */
  private handleUpdateEvent(event: ProgressEvent): void {
    const { id, message } = event;
    const existing = this.store.progressMap.get(id);
    if (existing) {
      existing.message = message;
      this.logStore.addMessage(`[${existing.fileName}] ${message}`);
    }
  }

  /**
   * 处理增量事件
   */
  private handleIncrementEvent(event: ProgressEvent): void {
    const { id, current } = event;
    const now = Date.now();
    const progressItem = this.store.progressMap.get(id);
    
    if (!progressItem || progressItem.current === undefined) return;
    
    // 更新进度
    progressItem.current += current || 0;
    this.store.updateProgress({ current: progressItem.current });
    
    // 计算百分比
    if (progressItem.total && progressItem.total > 0) {
      progressItem.percentage = Math.round((progressItem.current / progressItem.total) * 100);
      this.store.updateProgress({ percentage: progressItem.percentage });
    }
    
    // 计算速度和ETA
    this.calculateSpeedAndETA(progressItem, now);
    
    // 更新状态
    if (progressItem.percentage >= 100) {
      progressItem.status = ProgressStatus.COMPLETED;
    }
    
    // 记录详细日志
    this.logProgressDetails(progressItem);
  }

  /**
   * 处理完成事件
   */
  private handleFinishEvent(event: ProgressEvent): void {
    const { id, message } = event;
    const finishedItem = this.store.progressMap.get(id);
    
    if (!finishedItem) return;
    
    finishedItem.status = ProgressStatus.COMPLETED;
    finishedItem.percentage = 100;
    
    if (finishedItem.operationType === OperationType.DOWNLOAD) {
      this.handleDownloadComplete(finishedItem, message);
    } else {
      this.handleOtherOperationComplete(finishedItem, message);
    }
  }

  /**
   * 更新当前操作状态
   */
  private updateCurrentOperation(operationType: OperationType, fileName?: string): void {
    if (operationType === OperationType.DOWNLOAD && fileName) {
      this.store.setCurrentFlashingFile(fileName);
      this.store.setCurrentOperation(MessageParser.getOperationName(operationType));
    } else {
      this.store.setCurrentOperation(MessageParser.getOperationName(operationType));
    }
  }

  /**
   * 更新总进度状态
   */
  private updateTotalProgress(fileName: string, total?: number): void {
    this.store.updateProgress({
      currentFileName: fileName,
      totalCount: this.store.selectedFiles.length,
      current: 0,
      total: total || 0,
      percentage: 0,
      speed: 0,
      eta: 0
    });
  }

  /**
   * 创建进度项
   */
  private createProgressItem(id: number, data: Partial<ProgressItem>): void {
    const item: ProgressItem = {
      step: data.step || '',
      message: data.message || '',
      current: data.current,
      total: data.total,
      startTime: data.startTime,
      speed: 0,
      eta: 0,
      percentage: 0,
      fileName: data.fileName || '',
      address: data.address || 0,
      status: ProgressStatus.ACTIVE,
      operationType: data.operationType
    };
    
    this.store.updateProgressMap(id, item);
  }

  /**
   * 计算速度和ETA
   */
  private calculateSpeedAndETA(progressItem: ProgressItem, now: number): void {
    if (progressItem.startTime && progressItem.current && progressItem.current > 0) {
      const elapsed = (now - progressItem.startTime) / 1000; // 秒
      progressItem.speed = progressItem.current / elapsed; // bytes/s
      this.store.updateProgress({ speed: progressItem.speed });
      
      if (progressItem.total && progressItem.speed > 0) {
        const remaining = progressItem.total - progressItem.current;
        progressItem.eta = remaining / progressItem.speed; // 剩余秒数
        this.store.updateProgress({ eta: progressItem.eta });
      }
    }
  }

  /**
   * 记录进度详细信息
   */
  private logProgressDetails(progressItem: ProgressItem): void {
    if (!progressItem.total) return;
    
    const percentage = progressItem.percentage;
    const speedStr = progressItem.speed ? ` @ ${this.formatSpeed(progressItem.speed)}` : '';
    const etaStr = progressItem.eta && progressItem.eta > 0 ? ` (剩余 ${this.formatTime(progressItem.eta)})` : '';
    
    this.logStore.addMessage(
      `[${progressItem.fileName}] 进度: ${percentage}% (${this.formatBytes(progressItem.current)}/${this.formatBytes(progressItem.total)})${speedStr}${etaStr}`
    );
  }

  /**
   * 处理下载完成
   */
  private handleDownloadComplete(finishedItem: ProgressItem, message: string): void {
    // 只有下载操作完成时才标记文件为完成
    this.store.addCompletedFile(finishedItem.fileName);
    
    // 更新完成计数
    const completedCount = this.store.completedFiles.size;
    this.store.updateProgress({ 
      completedCount,
      percentage: 100 
    });
    
    // 清除当前烧录文件状态
    if (this.store.currentFlashingFile === finishedItem.fileName) {
      this.store.setCurrentFlashingFile('');
    }
    
    this.logStore.addMessage(`[${finishedItem.fileName}] ${message}`, true);
    
    // 检查是否所有文件都完成了
    if (this.store.completedFiles.size >= this.store.selectedFiles.length) {
      this.store.setFlashCompleted(true);
      this.store.setCurrentOperation('');
      this.store.updateProgress({ currentFileName: '' });
      this.logStore.addMessage(`所有文件烧录完成！`, true);
    }
  }

  /**
   * 处理其他操作完成
   */
  private handleOtherOperationComplete(finishedItem: ProgressItem, message: string): void {
    const operationName = MessageParser.getOperationName(finishedItem.operationType || OperationType.UNKNOWN);
    this.logStore.addMessage(`[${operationName}] ${message}`, true);
    
    // 清除当前操作状态（对于非下载操作）
    this.store.setCurrentOperation('');
  }

  /**
   * 重置所有状态
   */
  resetAllStates(): void {
    this.store.resetProgressStates();
  }

  // 工具方法
  private formatBytes(bytes: number | undefined): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private formatSpeed(bytesPerSecond: number | undefined): string {
    if (!bytesPerSecond) return '-- KB/s';
    return this.formatBytes(bytesPerSecond) + '/s';
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(0)}秒`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}分${remainingSeconds}秒`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}时${minutes}分`;
    }
  }
}
