import type { FlashFile } from '../types/progress';
import { OperationType, type MessageParseResult } from '../types/progress';

/**
 * 消息解析工具类
 */
export class MessageParser {
  /**
   * 解析进度消息，提取操作类型、地址和文件名信息
   */
  static parseMessage(message: string, selectedFiles: FlashFile[]): MessageParseResult {
    const result: MessageParseResult = {
      operationType: OperationType.UNKNOWN,
      address: null,
      fileName: null
    };
    
    // 检查是否是擦除操作
    if (message.includes('Erasing') || message.includes('Erase')) {
      result.operationType = OperationType.ERASE;
      return result;
    }
    
    // 检查是否是验证操作
    if (message.includes('Verify')) {
      result.operationType = OperationType.VERIFY;
      return result;
    }
    
    // 检查是否是下载操作
    if (message.includes('Download')) {
      result.operationType = OperationType.DOWNLOAD;
      
      // 提取地址信息：匹配 "Download at 0xXXXXXXXX" 格式
      const addressMatch = message.match(/at 0x([0-9a-fA-F]+)/i);
      if (addressMatch) {
        result.address = parseInt(addressMatch[1], 16);
        
        // 根据地址找到对应的文件
        const matchingFile = this.findFileByAddress(selectedFiles, result.address);
        if (matchingFile) {
          result.fileName = matchingFile.name;
        }
      }
    }
    
    return result;
  }

  /**
   * 根据地址查找对应的文件
   */
  private static findFileByAddress(files: FlashFile[], targetAddress: number): FlashFile | null {
    return files.find(file => {
      if (!file.address) return false;
      
      try {
        let fileAddress: number;
        if (file.address.startsWith('0x')) {
          fileAddress = parseInt(file.address, 16);
        } else {
          fileAddress = parseInt(file.address, 10);
        }
        return fileAddress === targetAddress;
      } catch {
        return false;
      }
    }) || null;
  }

  /**
   * 获取操作的中文描述
   */
  static getOperationName(operationType: OperationType): string {
    switch (operationType) {
      case OperationType.ERASE:
        return '擦除';
      case OperationType.DOWNLOAD:
        return '下载';
      case OperationType.VERIFY:
        return '验证';
      case OperationType.UNKNOWN:
      default:
        return '操作';
    }
  }
}
