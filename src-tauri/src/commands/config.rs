use crate::types::{ExtractedFile, SftoolParamConfig, SftoolParamParseResult};
use crate::utils::validate_config_with_device;
use std::path::Path;

#[tauri::command]
pub async fn parse_sftool_param_file(
    config_file_path: String,
    current_chip: Option<String>,
    current_memory: Option<String>,
) -> Result<SftoolParamParseResult, String> {
    // 读取配置文件
    let config_content = std::fs::read_to_string(&config_file_path)
        .map_err(|e| format!("无法读取配置文件 {}: {}", config_file_path, e))?;

    // 解析 JSON
    let config: SftoolParamConfig = serde_json::from_str(&config_content)
        .map_err(|e| format!("解析配置文件 JSON 失败: {}", e))?;

    // 验证基本结构
    let write_flash = config
        .write_flash
        .as_ref()
        .ok_or("配置文件缺少 write_flash 字段")?;

    if write_flash.files.is_empty() {
        return Err("配置文件中 write_flash.files 字段为空".to_string());
    }

    // 获取配置文件所在目录
    let config_dir = Path::new(&config_file_path)
        .parent()
        .ok_or("无法获取配置文件所在目录")?;

    // 提取和验证文件
    let mut extracted_files = Vec::new();

    for file_config in &write_flash.files {
        // 解析文件路径（可能是相对路径）
        let file_path = if Path::new(&file_config.path).is_absolute() {
            file_config.path.clone()
        } else {
            config_dir
                .join(&file_config.path)
                .to_string_lossy()
                .to_string()
        };

        // 检查文件是否存在
        let file_metadata = std::fs::metadata(&file_path)
            .map_err(|e| format!("配置文件中引用的文件不存在: {} ({})", file_path, e))?;

        // 获取文件名
        let file_name = Path::new(&file_config.path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or(&file_config.path)
            .to_string();

        // 处理地址
        let address = file_config
            .address
            .clone()
            .unwrap_or_else(|| "0x10000000".to_string());

        extracted_files.push(ExtractedFile {
            path: file_path,
            address,
            name: file_name,
            size: file_metadata.len(),
        });
    }

    // 验证配置与当前设备设置的兼容性
    let validation = validate_config_with_device(&config, current_chip, current_memory);

    Ok(SftoolParamParseResult {
        config,
        validation,
        extracted_files,
    })
}

#[tauri::command]
pub async fn validate_firmware_file(file_path: String) -> Result<bool, String> {
    // 检查文件是否存在
    if !std::path::Path::new(&file_path).exists() {
        return Err(format!("文件不存在: {}", file_path));
    }

    // 检查文件大小是否合理
    match std::fs::metadata(&file_path) {
        Ok(metadata) => {
            let size = metadata.len();
            if size == 0 {
                return Err("文件为空".to_string());
            }
            if size > 100 * 1024 * 1024 {
                // 100MB 限制
                return Err("文件过大，可能不是有效的固件文件".to_string());
            }
        }
        Err(e) => return Err(format!("无法读取文件信息: {}", e)),
    }

    // 这里可以添加更多的文件格式验证逻辑
    Ok(true)
}
