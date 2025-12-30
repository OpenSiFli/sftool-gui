/**
 * sftool_param.json 配置文件类型定义
 */

export interface SftoolParamFile {
  path: string;
  address?: string;
}

export interface WriteFlashCommand {
  verify?: boolean;
  erase_all?: boolean;
  no_compress?: boolean;
  files: SftoolParamFile[];
}

export interface ReadFlashFile {
  path: string;
  address: string;
  size: string;
}

export interface ReadFlashCommand {
  files: ReadFlashFile[];
}

export interface EraseFlashCommand {
  address: string;
}

export interface RegionItem {
  address: string;
  size: string;
}

export interface EraseRegionCommand {
  regions: RegionItem[];
}

export interface SftoolParamConfig {
  chip: 'SF32LB52' | 'SF32LB55' | 'SF32LB56' | 'SF32LB58';
  memory?: 'nor' | 'nand' | 'sd';
  port?: string;
  baud?: number;
  before?: 'no_reset' | 'soft_reset' | 'default_reset';
  after?: 'no_reset' | 'soft_reset' | 'default_reset';
  connect_attempts?: number;
  compat?: boolean;
  quiet?: boolean;
  write_flash?: WriteFlashCommand;
  read_flash?: ReadFlashCommand;
  erase_flash?: EraseFlashCommand;
  erase_region?: EraseRegionCommand;
}

/**
 * 配置文件验证结果
 */
export interface ConfigValidationResult {
  isValid: boolean;
  chipMismatch?: boolean;
  memoryMismatch?: boolean;
  currentChip?: string;
  currentMemory?: string;
  configChip?: string;
  configMemory?: string;
  errors: string[];
  warnings: string[];
}

/**
 * 提取的文件信息
 */
export interface ExtractedFile {
  path: string;
  address: string;
  name: string;
  size: number;
}

/**
 * 解析结果
 */
export interface SftoolParamParseResult {
  config: SftoolParamConfig;
  validation: ConfigValidationResult;
  extractedFiles: ExtractedFile[];
}
