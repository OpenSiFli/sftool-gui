use crate::types::DeviceConfig;
use crate::utils::stub_ops::prepare_stub_path;
use sftool_lib::{
    create_sifli_tool, progress::ProgressSinkArc, BeforeOperation, ChipType, SifliTool,
    SifliToolBase,
};

/// 创建 SifliTool 实例（无进度回调）
pub fn create_tool_instance(config: &DeviceConfig) -> Result<Box<dyn SifliTool>, String> {
    // 解析芯片类型
    let chip_type = match config.chip_type.to_uppercase().as_str() {
        "SF32LB52" => ChipType::SF32LB52,
        "SF32LB55" => ChipType::SF32LB55,
        "SF32LB56" => ChipType::SF32LB56,
        "SF32LB58" => ChipType::SF32LB58,
        _ => return Err(format!("不支持的芯片型号: {}", config.chip_type)),
    };

    // 创建 SifliToolBase (无进度回调)
    let base = SifliToolBase::new_with_no_progress(
        config.port_name.clone(),
        BeforeOperation::NoReset,
        config.memory_type.to_lowercase(),
        config.baud_rate,
        3,
        false,
    );

    // 创建对应的工具实例
    let tool = create_sifli_tool(chip_type, base);
    Ok(tool)
}

/// 创建带进度回调的 SifliTool 实例
pub fn create_tool_instance_with_progress(
    config: &DeviceConfig,
    progress_callback: ProgressSinkArc,
) -> Result<Box<dyn SifliTool>, String> {
    // 解析芯片类型
    let chip_type = match config.chip_type.to_uppercase().as_str() {
        "SF32LB52" => ChipType::SF32LB52,
        "SF32LB55" => ChipType::SF32LB55,
        "SF32LB56" => ChipType::SF32LB56,
        "SF32LB58" => ChipType::SF32LB58,
        _ => return Err(format!("不支持的芯片型号: {}", config.chip_type)),
    };

    // parse before/after operation strings into enums
    let before_enum = match config.before_operation.as_str() {
        "default_reset" => BeforeOperation::DefaultReset,
        "no_reset" => BeforeOperation::NoReset,
        "no_reset_no_sync" => BeforeOperation::NoResetNoSync,
        _ => BeforeOperation::NoReset,
    };

    let (stub_path, _temp_file) = prepare_stub_path(
        if !config.stub_path.is_empty() {
            Some(config.stub_path.as_str())
        } else {
            None
        },
        &chip_type,
        &config.memory_type.to_lowercase(),
        None,
    )
    .map_err(|e| format!("准备存根文件失败: {}", e))?;

    // 创建 SifliToolBase (带进度回调)
    let base = SifliToolBase::new_with_external_stub(
        config.port_name.clone(),
        before_enum,
        config.memory_type.to_lowercase(),
        config.baud_rate,
        1,
        false,
        progress_callback,
        stub_path,
    );

    // 创建对应的工具实例
    let tool = create_sifli_tool(chip_type, base);
    Ok(tool)
}
