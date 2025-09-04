use crate::types::{SftoolParamConfig, ConfigValidationResult};

/// 验证配置与当前设备设置的兼容性
pub fn validate_config_with_device(
    config: &SftoolParamConfig,
    current_chip: Option<String>,
    current_memory: Option<String>,
) -> ConfigValidationResult {
    let mut result = ConfigValidationResult {
        is_valid: true,
        chip_mismatch: None,
        memory_mismatch: None,
        current_chip: current_chip.clone(),
        current_memory: current_memory.clone(),
        config_chip: Some(config.chip.clone()),
        config_memory: Some(config.memory.clone().unwrap_or_else(|| "nor".to_string())),
        errors: Vec::new(),
        warnings: Vec::new(),
    };

    // 检查芯片类型匹配
    if let Some(ref current) = current_chip {
        if current.to_lowercase() != config.chip.to_lowercase() {
            result.chip_mismatch = Some(true);
            result.is_valid = false;
            result.errors.push(format!(
                "芯片类型不匹配: 当前设备 {}，配置文件 {}", 
                current, 
                config.chip
            ));
        }
    }

    // 检查存储类型匹配
    let config_memory_type = config.memory.clone().unwrap_or_else(|| "nor".to_string());
    if let Some(ref current) = current_memory {
        if current.to_lowercase() != config_memory_type.to_lowercase() {
            result.memory_mismatch = Some(true);
            result.is_valid = false;
            result.errors.push(format!(
                "存储器类型不匹配: 当前设备 {}，配置文件 {}", 
                current, 
                config_memory_type
            ));
        }
    }

    // 检查write_flash命令
    if config.write_flash.is_none() {
        result.is_valid = false;
        result.errors.push("配置文件中没有找到有效的write_flash命令".to_string());
    } else if let Some(ref write_flash) = config.write_flash {
        if write_flash.files.is_empty() {
            result.is_valid = false;
            result.errors.push("配置文件中write_flash命令的文件列表为空".to_string());
        }
    }

    result
}
