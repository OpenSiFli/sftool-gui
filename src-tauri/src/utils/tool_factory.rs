use crate::types::DeviceConfig;
use crate::utils::stub_ops::prepare_stub_path;
use serialport::SerialPort;
use sftool_lib::{
    create_sifli_tool, progress::ProgressSinkArc, BeforeOperation, CancelToken, ChipType,
    EraseFlashParams, EraseFlashTrait, EraseRegionParams, ReadFlashParams, ReadFlashTrait,
    SifliTool, SifliToolBase, SifliToolTrait, WriteFlashParams, WriteFlashTrait,
};

struct ToolWithStubOwner {
    inner: Box<dyn SifliTool>,
    _temp_stub_file: Option<tempfile::NamedTempFile>,
}

impl ToolWithStubOwner {
    fn new(inner: Box<dyn SifliTool>, temp_stub_file: Option<tempfile::NamedTempFile>) -> Self {
        Self {
            inner,
            _temp_stub_file: temp_stub_file,
        }
    }
}

impl SifliToolTrait for ToolWithStubOwner {
    fn port(&mut self) -> &mut Box<dyn SerialPort> {
        self.inner.port()
    }

    fn base(&self) -> &SifliToolBase {
        self.inner.base()
    }

    fn set_speed(&mut self, baud: u32) -> sftool_lib::Result<()> {
        self.inner.set_speed(baud)
    }

    fn soft_reset(&mut self) -> sftool_lib::Result<()> {
        self.inner.soft_reset()
    }
}

impl WriteFlashTrait for ToolWithStubOwner {
    fn write_flash(&mut self, params: &WriteFlashParams) -> sftool_lib::Result<()> {
        self.inner.write_flash(params)
    }
}

impl ReadFlashTrait for ToolWithStubOwner {
    fn read_flash(&mut self, params: &ReadFlashParams) -> sftool_lib::Result<()> {
        self.inner.read_flash(params)
    }
}

impl EraseFlashTrait for ToolWithStubOwner {
    fn erase_flash(&mut self, params: &EraseFlashParams) -> sftool_lib::Result<()> {
        self.inner.erase_flash(params)
    }

    fn erase_region(&mut self, params: &EraseRegionParams) -> sftool_lib::Result<()> {
        self.inner.erase_region(params)
    }
}

impl SifliTool for ToolWithStubOwner {
    fn create_tool(_base_param: SifliToolBase) -> Box<dyn SifliTool>
    where
        Self: Sized,
    {
        unreachable!("ToolWithStubOwner is a delegating wrapper, not a chip-specific factory")
    }
}

/// 创建 SifliTool 实例（无进度回调）
pub fn create_tool_instance(config: &DeviceConfig) -> Result<Box<dyn SifliTool>, String> {
    // 解析芯片类型
    let chip_type = match config.chip_type.to_uppercase().as_str() {
        "SF32LB52" => ChipType::SF32LB52,
        "SF32LB55" => ChipType::SF32LB55,
        "SF32LB56" => ChipType::SF32LB56,
        "SF32LB57" => ChipType::SF32LB57,
        "SF32LB58" => ChipType::SF32LB58,
        _ => return Err(format!("不支持的芯片型号: {}", config.chip_type)),
    };

    let external_stub_path = if !config.external_stub_path.is_empty() {
        Some(config.external_stub_path.clone())
    } else {
        None
    };

    // 创建 SifliToolBase (无进度回调)
    let base = SifliToolBase::new_with_external_stub(
        config.port_name.clone(),
        BeforeOperation::NoReset,
        config.memory_type.to_lowercase(),
        config.baud_rate,
        3,
        false,
        sftool_lib::progress::no_op_progress_sink(),
        external_stub_path,
    );

    // 创建对应的工具实例
    let tool = create_sifli_tool(chip_type, base);
    Ok(tool)
}

/// 创建带进度回调的 SifliTool 实例
pub fn create_tool_instance_with_progress(
    config: &DeviceConfig,
    progress_callback: ProgressSinkArc,
    cancel_token: CancelToken,
) -> Result<Box<dyn SifliTool>, String> {
    // 解析芯片类型
    let chip_type = match config.chip_type.to_uppercase().as_str() {
        "SF32LB52" => ChipType::SF32LB52,
        "SF32LB55" => ChipType::SF32LB55,
        "SF32LB56" => ChipType::SF32LB56,
        "SF32LB57" => ChipType::SF32LB57,
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

    let (stub_path, temp_stub_file) = prepare_stub_path(
        if !config.stub_config_path.is_empty() {
            Some(config.stub_config_path.as_str())
        } else {
            None
        },
        &chip_type,
        &config.memory_type.to_lowercase(),
        if !config.external_stub_path.is_empty() {
            Some(config.external_stub_path.clone())
        } else {
            None
        },
    )
    .map_err(|e| format!("准备存根文件失败: {}", e))?;

    // 创建 SifliToolBase (带进度回调)
    let base = SifliToolBase::new_with_external_stub_and_cancel(
        config.port_name.clone(),
        before_enum,
        config.memory_type.to_lowercase(),
        config.baud_rate,
        1,
        false,
        progress_callback,
        stub_path,
        cancel_token,
    );

    // 创建对应的工具实例
    let tool = create_sifli_tool(chip_type, base);
    Ok(Box::new(ToolWithStubOwner::new(tool, temp_stub_file)))
}
