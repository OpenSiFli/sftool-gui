use crate::types::DeviceConfig;
use crate::utils::stub_ops::prepare_stub_path;
use serialport::{ErrorKind as SerialPortErrorKind, SerialPort};
use sftool_lib::{
    create_sifli_tool, progress::ProgressSinkArc, BeforeOperation, CancelToken, ChipType,
    EraseFlashParams, EraseFlashTrait, EraseRegionParams, ReadFlashParams, ReadFlashTrait,
    SifliTool, SifliToolBase, SifliToolTrait, WriteFlashParams, WriteFlashTrait,
};
use std::any::Any;
use std::io::ErrorKind as IoErrorKind;
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::thread;
use std::time::Duration;

const CONNECT_ATTEMPTS: i8 = 1;
const SERIAL_OPEN_RETRY_ATTEMPTS: u8 = 10;
const SERIAL_OPEN_RETRY_DELAY: Duration = Duration::from_millis(500);

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

fn parse_chip_type(chip_type: &str) -> Result<ChipType, String> {
    match chip_type.to_uppercase().as_str() {
        "SF32LB52" => Ok(ChipType::SF32LB52),
        "SF32LB55" => Ok(ChipType::SF32LB55),
        "SF32LB56" => Ok(ChipType::SF32LB56),
        "SF32LB58" => Ok(ChipType::SF32LB58),
        _ => Err(format!("不支持的芯片型号: {}", chip_type)),
    }
}

fn wait_for_serial_port(port_name: &str, baud_rate: u32) -> Result<(), String> {
    wait_for_serial_port_with_retry(port_name, SERIAL_OPEN_RETRY_ATTEMPTS, || {
        serialport::new(port_name, baud_rate)
            .timeout(Duration::from_millis(200))
            .open()
            .map(|_| ())
    })
}

fn wait_for_serial_port_with_retry<F>(
    port_name: &str,
    max_attempts: u8,
    mut opener: F,
) -> Result<(), String>
where
    F: FnMut() -> serialport::Result<()>,
{
    let attempts = max_attempts.max(1);
    let mut last_error: Option<serialport::Error> = None;

    for attempt in 1..=attempts {
        match opener() {
            Ok(()) => return Ok(()),
            Err(error) => {
                if attempt == attempts {
                    return Err(format_serial_open_error(port_name, &error));
                }

                last_error = Some(error);
                thread::sleep(SERIAL_OPEN_RETRY_DELAY);
            }
        }
    }

    match last_error {
        Some(error) => Err(format_serial_open_error(port_name, &error)),
        None => Err(format!("串口 {} 打开失败：未执行连接尝试", port_name)),
    }
}

fn format_serial_open_error(port_name: &str, error: &serialport::Error) -> String {
    let detail = error.to_string();
    let detail_lower = detail.to_lowercase();
    let access_denied = detail_lower.contains("access is denied")
        || detail_lower.contains("permission denied")
        || detail_lower.contains("拒绝访问")
        || detail_lower.contains("权限");

    match error.kind() {
        SerialPortErrorKind::NoDevice if access_denied => format!(
            "串口 {} 被占用或权限不足，请关闭其它串口工具后重试。原始错误: {}",
            port_name, detail
        ),
        SerialPortErrorKind::NoDevice => format!(
            "串口 {} 不可用，可能已断开、端口不存在或被系统占用。原始错误: {}",
            port_name, detail
        ),
        SerialPortErrorKind::InvalidInput => format!(
            "串口 {} 参数无效，请检查端口名和波特率设置。原始错误: {}",
            port_name, detail
        ),
        SerialPortErrorKind::Io(IoErrorKind::PermissionDenied) => format!(
            "串口 {} 被占用或权限不足，请关闭其它串口工具后重试。原始错误: {}",
            port_name, detail
        ),
        SerialPortErrorKind::Io(IoErrorKind::NotFound) => format!(
            "串口 {} 不存在或已断开，请刷新串口列表后重试。原始错误: {}",
            port_name, detail
        ),
        SerialPortErrorKind::Io(IoErrorKind::TimedOut | IoErrorKind::WouldBlock) => {
            format!(
                "串口 {} 打开超时，请检查串口驱动或重新插拔设备。原始错误: {}",
                port_name, detail
            )
        }
        _ if access_denied => format!(
            "串口 {} 被占用或权限不足，请关闭其它串口工具后重试。原始错误: {}",
            port_name, detail
        ),
        _ => format!("串口 {} 打开失败。原始错误: {}", port_name, detail),
    }
}

fn create_sifli_tool_checked(
    chip_type: ChipType,
    base: SifliToolBase,
) -> Result<Box<dyn SifliTool>, String> {
    catch_unwind(AssertUnwindSafe(|| create_sifli_tool(chip_type, base)))
        .map_err(format_tool_creation_panic)
}

fn format_tool_creation_panic(payload: Box<dyn Any + Send>) -> String {
    let detail = panic_payload_to_string(&payload);
    let detail_lower = detail.to_lowercase();

    if detail_lower.contains("failed to connect to the chip")
        || detail_lower.contains("timeout while")
        || detail_lower.contains("receive timeout")
        || detail_lower.contains("timed out")
    {
        return format!(
            "连接超时：串口已打开，但芯片未响应。请确认开发板已上电、BOOT/复位操作正确，且芯片型号和接口选择匹配。原始错误: {}",
            detail
        );
    }

    if detail_lower.contains("failed to download stub") {
        return format!(
            "Stub 下载失败：串口已打开，但初始化程序下载失败。请检查存储器类型、Stub 配置/外部 Stub 文件和复位方式。原始错误: {}",
            detail
        );
    }

    if detail_lower.contains("access is denied")
        || detail_lower.contains("permission denied")
        || detail_lower.contains("拒绝访问")
    {
        return format!(
            "串口被占用或权限不足，请关闭其它串口工具后重试。原始错误: {}",
            detail
        );
    }

    if detail_lower.contains("cannot find")
        || detail_lower.contains("not found")
        || detail_lower.contains("no such file")
    {
        return format!(
            "串口不存在或已断开，请刷新串口列表后重试。原始错误: {}",
            detail
        );
    }

    format!("连接失败：工具初始化异常。原始错误: {}", detail)
}

fn panic_payload_to_string(payload: &(dyn Any + Send)) -> String {
    if let Some(message) = payload.downcast_ref::<String>() {
        message.clone()
    } else if let Some(message) = payload.downcast_ref::<&str>() {
        (*message).to_string()
    } else {
        "unknown panic".to_string()
    }
}

fn build_tool_base_with_progress(
    config: &DeviceConfig,
    progress_callback: ProgressSinkArc,
    cancel_token: CancelToken,
) -> Result<(SifliToolBase, Option<tempfile::NamedTempFile>), String> {
    let chip_type = parse_chip_type(&config.chip_type)?;

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

    let base = SifliToolBase::new_with_external_stub_and_cancel(
        config.port_name.clone(),
        before_enum,
        config.memory_type.to_lowercase(),
        config.baud_rate,
        CONNECT_ATTEMPTS,
        false,
        progress_callback,
        stub_path,
        cancel_token,
    );

    Ok((base, temp_stub_file))
}

/// 创建 SifliTool 实例（无进度回调）
pub fn create_tool_instance(config: &DeviceConfig) -> Result<Box<dyn SifliTool>, String> {
    // 解析芯片类型
    let chip_type = parse_chip_type(&config.chip_type)?;

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
        CONNECT_ATTEMPTS,
        false,
        sftool_lib::progress::no_op_progress_sink(),
        external_stub_path,
    );

    // 创建对应的工具实例
    let tool = create_sifli_tool_checked(chip_type, base)?;
    Ok(tool)
}

/// 创建带进度回调的 SifliTool 实例
pub fn create_tool_instance_with_progress(
    config: &DeviceConfig,
    progress_callback: ProgressSinkArc,
    cancel_token: CancelToken,
) -> Result<Box<dyn SifliTool>, String> {
    // 解析芯片类型
    let chip_type = parse_chip_type(&config.chip_type)?;
    let (base, temp_stub_file) =
        build_tool_base_with_progress(config, progress_callback.clone(), cancel_token)?;

    wait_for_serial_port(&config.port_name, config.baud_rate)?;

    // 创建对应的工具实例
    let tool = create_sifli_tool_checked(chip_type, base)?;
    Ok(Box::new(ToolWithStubOwner::new(tool, temp_stub_file)))
}
