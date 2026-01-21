import type { FlashFile, ProgressOperation } from '../types/progress';
import { OperationType, type MessageParseResult } from '../types/progress';

/**
 * 消息解析工具类
 */
export class MessageParser {
  /**
   * 解析进度消息，提取操作类型、地址和文件名信息
   */
  static parseMessage(
    message: string | undefined,
    selectedFiles: FlashFile[],
    operation?: ProgressOperation
  ): MessageParseResult {
    const result: MessageParseResult = {
      operationType: OperationType.UNKNOWN,
      address: null,
      fileName: null,
    };

    if (operation) {
      const address = this.getOperationAddress(operation);
      result.operationType = this.getOperationType(operation);
      result.address = address;

      if (address !== null) {
        const matchingFile = this.findFileByAddress(selectedFiles, address);
        if (matchingFile) {
          result.fileName = matchingFile.name;
        }
      }

      return result;
    }

    if (!message) {
      return result;
    }

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

  private static getOperationType(operation: ProgressOperation): OperationType {
    switch (operation.kind) {
      case 'write_flash':
        return OperationType.DOWNLOAD;
      case 'verify':
        return OperationType.VERIFY;
      case 'erase_flash':
      case 'erase_region':
      case 'erase_all_regions':
        return OperationType.ERASE;
      case 'read_flash':
        return OperationType.READ;
      case 'connect':
        return OperationType.CONNECT;
      case 'download_stub':
        return OperationType.DOWNLOAD_STUB;
      case 'check_redownload':
        return OperationType.CHECK;
      case 'unknown':
      default:
        return OperationType.UNKNOWN;
    }
  }

  private static getOperationAddress(operation: ProgressOperation): number | null {
    switch (operation.kind) {
      case 'write_flash':
      case 'verify':
      case 'erase_flash':
      case 'erase_region':
      case 'check_redownload':
      case 'read_flash':
        return operation.address;
      default:
        return null;
    }
  }

  /**
   * 根据地址查找对应的文件
   */
  private static findFileByAddress(files: FlashFile[], targetAddress: number): FlashFile | null {
    return (
      files.find(file => {
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
      }) || null
    );
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
      case OperationType.READ:
        return '读取';
      case OperationType.CONNECT:
        return '连接';
      case OperationType.DOWNLOAD_STUB:
        return '下载 Stub';
      case OperationType.CHECK:
        return '检查';
      case OperationType.UNKNOWN:
      default:
        return '操作';
    }
  }
}
