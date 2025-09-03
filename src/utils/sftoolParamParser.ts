/**
 * sftool_param.json 文件解析和验证工具
 */

import { invoke } from '@tauri-apps/api/core';
import type { 
  SftoolParamConfig, 
  ConfigValidationResult, 
  SftoolParamParseResult 
} from '../types/sftoolParam';
import type { ChipModel } from '../config/chips';

/**
 * 解析 sftool_param.json 文件（通过Rust后端）
 */
export async function parseSftoolParamFile(filePath: string, currentChip?: ChipModel | null, currentMemory?: string | null): Promise<SftoolParamParseResult> {
  try {
    const result = await invoke<SftoolParamParseResult>('parse_sftool_param_file', {
      configFilePath: filePath,
      currentChip: currentChip?.id || null,
      currentMemory: currentMemory || null
    });
    
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
