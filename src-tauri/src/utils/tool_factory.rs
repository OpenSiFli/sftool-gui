use crate::types::DeviceConfig;
use sftool_lib::{
    create_sifli_tool, ChipType, BeforeOperation, SifliToolBase, SifliTool,
    progress::ProgressCallbackArc,
};

/// 创建 SifliTool 实例（无进度回调）
pub fn create_tool_instance(config: &DeviceConfig) -> Result<Box<dyn SifliTool>, String> {
    // 解析芯片类型
    let chip_type = match config.chip_type.to_uppercase().as_str() {
        "SF32LB52" => ChipType::SF32LB52,
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
    progress_callback: ProgressCallbackArc
) -> Result<Box<dyn SifliTool>, String> {
    // 解析芯片类型
    let chip_type = match config.chip_type.to_uppercase().as_str() {
        "SF32LB52" => ChipType::SF32LB52,
        "SF32LB56" => ChipType::SF32LB56,
        "SF32LB58" => ChipType::SF32LB58,
        _ => return Err(format!("不支持的芯片型号: {}", config.chip_type)),
    };

    // 创建 SifliToolBase (带进度回调)
    let base = SifliToolBase::new_with_progress(
        config.port_name.clone(),
        BeforeOperation::NoReset,
        config.memory_type.to_lowercase(),
        config.baud_rate,
        1,
        false,
        progress_callback,
    );

    // 创建对应的工具实例
    let tool = create_sifli_tool(chip_type, base);
    Ok(tool)
}
