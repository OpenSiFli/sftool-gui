use crate::types::StubConfigSpec;
use sftool_lib::ChipType;
use std::io::Write;
use tempfile;

pub fn load_stub_config_spec(path: &str) -> Result<StubConfigSpec, String> {
    // 读取文件内容，如果失败则返回带上下文的错误
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read stub config file '{}': {}", path, e))?;
    // 将 JSON 字符串解析为 StubConfigSpec 结构体
    let spec: StubConfigSpec = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse stub config JSON: {}", e))?;
    Ok(spec)
}

pub fn chip_key(chip_type: &ChipType) -> &'static str {
    // 根据芯片类型返回对应的字符串标识
    match chip_type {
        ChipType::SF32LB52 => "sf32lb52",
        ChipType::SF32LB55 => "sf32lb55",
        ChipType::SF32LB56 => "sf32lb56",
        ChipType::SF32LB57 => "sf32lb57",
        ChipType::SF32LB58 => "sf32lb58",
    }
}

pub fn prepare_stub_path(
    stub_config_json: Option<&str>,
    chip_type: &ChipType,
    memory_type: &str,
    stub_path: Option<String>,
) -> Result<(Option<String>, Option<tempfile::NamedTempFile>), String> {
    // 获取配置文件路径，如果没有则直接返回原始路径
    let config_path = match stub_config_json {
        Some(path) => path,
        None => return Ok((stub_path, None)),
    };

    // 加载存根配置规范
    let spec = load_stub_config_spec(config_path)?;
    // 将规范转换为配置对象
    let config = spec
        .to_stub_config()
        .map_err(|e| format!("Invalid stub config: {}", e))?;

    // 从库函数加载基础存根二进制数据
    let mut data =
        sftool_lib::load_stub_bytes(stub_path.as_deref(), chip_type.clone(), memory_type)
            .map_err(|e| format!("Failed to load base stub image: {}", e))?;

    // 将配置写入存根二进制数据中
    sftool_lib::stub_config::write_stub_config_to_bytes(&mut data, &config)
        .map_err(|e| format!("Failed to apply stub config: {}", e))?;

    // 创建临时文件，使用芯片类型和内存类型作为前缀标识
    let mut temp_file = tempfile::Builder::new()
        .prefix(&format!(
            "sftool_stub_{}_{}_",
            chip_key(chip_type),
            memory_type
        ))
        .suffix(".bin")
        .tempfile()
        .map_err(|e| format!("Failed to create temp stub file: {}", e))?;

    // 将包含配置的存根数据写入临时文件
    temp_file
        .write_all(&data)
        .map_err(|e| format!("Failed to write stub into temp file: {}", e))?;

    // 获取临时文件路径并返回
    let path = temp_file.path().to_string_lossy().to_string();
    Ok((Some(path), Some(temp_file)))
}

#[cfg(test)]
mod tests {
    use super::{chip_key, prepare_stub_path};
    use sftool_lib::ChipType;
    use std::io::Write;
    use std::path::Path;

    #[test]
    fn prepare_stub_path_without_config_preserves_original_stub_path() {
        let external_stub_path = Some("/tmp/custom_stub.bin".to_string());

        let (path, temp_owner) =
            prepare_stub_path(None, &ChipType::SF32LB52, "nor", external_stub_path.clone())
                .unwrap();

        assert_eq!(path, external_stub_path);
        assert!(temp_owner.is_none());
    }

    #[test]
    fn chip_key_supports_sf32lb57() {
        assert_eq!(chip_key(&ChipType::SF32LB57), "sf32lb57");
    }

    #[test]
    fn prepared_stub_temp_file_lives_until_owner_is_dropped() {
        let mut config_file = tempfile::NamedTempFile::new().unwrap();
        config_file.write_all(b"{}").unwrap();
        config_file.flush().unwrap();

        let (stub_path, temp_owner) = prepare_stub_path(
            Some(config_file.path().to_str().unwrap()),
            &ChipType::SF32LB52,
            "nor",
            None,
        )
        .unwrap();

        let stub_path = stub_path.unwrap();
        let temp_owner = temp_owner.expect("custom stub config should create a temp stub file");
        assert!(Path::new(&stub_path).exists());

        drop(temp_owner);
        assert!(!Path::new(&stub_path).exists());
    }
}
