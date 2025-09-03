/**
 * sftool_param.json 文件解析和验证工具
 */

import { readTextFile, exists } from '@tauri-apps/plugin-fs';
import { dirname, resolve } from '@tauri-apps/api/path';
import type { 
  SftoolParamConfig, 
  ConfigValidationResult, 
  SftoolParamParseResult 
} from '../types/sftoolParam';
import type { ChipModel } from '../config/chips';

/**
 * 解析 sftool_param.json 文件
 */
export async function parseSftoolParamFile(filePath: string): Promise<SftoolParamParseResult> {
  try {
    // 读取文件内容
    const content = await readTextFile(filePath);
    const config: SftoolParamConfig = JSON.parse(content);
    
    // 验证基本结构
    if (!config.chip || !config.write_flash?.files) {
      throw new Error('配置文件缺少必要字段: chip 或 write_flash.files');
    }

    // 提取文件信息
    const extractedFiles = [];
    const configDir = await dirname(filePath);
    
    for (const file of config.write_flash.files) {
      // 解析文件路径（可能是相对路径）
      let fullPath = file.path;
      if (!fullPath.startsWith('/') && !fullPath.match(/^[A-Za-z]:/)) {
        // 相对路径，相对于配置文件目录
        fullPath = await resolve(configDir, file.path);
      }

      // 检查文件是否存在
      const fileExists = await exists(fullPath);
      if (!fileExists) {
        console.warn(`配置文件中引用的文件不存在: ${fullPath}`);
        continue;
      }

      // 提取文件名
      const fileName = file.path.split(/[\/\\]/).pop() || file.path;
      
      // 处理地址
      let address = '0x10000000'; // 默认地址
      if (file.address) {
        address = file.address;
      }

      extractedFiles.push({
        path: fullPath,
        address,
        name: fileName
      });
    }

    const result: SftoolParamParseResult = {
      config,
      validation: { isValid: true, errors: [], warnings: [] },
      extractedFiles
    };

    return result;
    
  } catch (error) {
    throw new Error(`解析配置文件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 验证配置文件与当前设备设置的兼容性
 */
export function validateConfigWithDevice(
  config: SftoolParamConfig,
  currentChip: ChipModel | null,
  currentMemory: string | null
): ConfigValidationResult {
  const result: ConfigValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    currentChip: currentChip?.id || '',
    currentMemory: currentMemory || '',
    configChip: config.chip,
    configMemory: config.memory || 'nor'
  };

  // 检查芯片类型匹配
  if (currentChip && currentChip.id.toLowerCase() !== config.chip.toLowerCase()) {
    result.chipMismatch = true;
    result.isValid = false;
    result.errors.push(`芯片类型不匹配: 当前设备 ${currentChip.id}，配置文件 ${config.chip}`);
  }

  // 检查存储类型匹配
  const configMemoryType = (config.memory || 'nor').toLowerCase();
  const currentMemoryType = (currentMemory || '').toLowerCase();
  
  if (currentMemory && currentMemoryType !== configMemoryType) {
    result.memoryMismatch = true;
    result.isValid = false;
    result.errors.push(`存储器类型不匹配: 当前设备 ${currentMemory}，配置文件 ${config.memory || 'nor'}`);
  }

  // 检查是否有write_flash命令
  if (!config.write_flash || !config.write_flash.files || config.write_flash.files.length === 0) {
    result.isValid = false;
    result.errors.push('配置文件中没有找到有效的write_flash命令或文件列表为空');
  }

  return result;
}

/**
 * 检查文件是否是sftool参数配置文件
 */
export function isSftoolParamFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('sftool_param.json') || 
         fileName.toLowerCase() === 'sftool_param.json';
}

/**
 * 格式化验证错误信息为用户友好的文本
 */
export function formatValidationErrors(validation: ConfigValidationResult): string[] {
  const messages: string[] = [];
  
  if (validation.chipMismatch) {
    messages.push(`芯片类型不匹配：当前 ${validation.currentChip}，配置 ${validation.configChip}`);
  }
  
  if (validation.memoryMismatch) {
    messages.push(`存储器类型不匹配：当前 ${validation.currentMemory}，配置 ${validation.configMemory}`);
  }
  
  validation.errors.forEach(error => {
    messages.push(error);
  });
  
  return messages;
}

/**
 * 格式化验证警告信息
 */
export function formatValidationWarnings(validation: ConfigValidationResult): string[] {
  return validation.warnings || [];
}
