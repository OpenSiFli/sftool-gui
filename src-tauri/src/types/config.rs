use serde::{Deserialize, Serialize};

// sftool_param.json 相关类型定义
#[derive(Debug, Serialize, Deserialize)]
pub struct SftoolParamFile {
    pub path: String,
    pub address: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WriteFlashCommand {
    pub verify: Option<bool>,
    pub erase_all: Option<bool>,
    pub no_compress: Option<bool>,
    pub files: Vec<SftoolParamFile>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SftoolParamConfig {
    pub chip: String,
    pub memory: Option<String>,
    pub port: Option<String>,
    pub baud: Option<u32>,
    pub before: Option<String>,
    pub after: Option<String>,
    pub connect_attempts: Option<u32>,
    pub compat: Option<bool>,
    pub quiet: Option<bool>,
    pub write_flash: Option<WriteFlashCommand>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConfigValidationResult {
    #[serde(rename = "isValid")]
    pub is_valid: bool,
    #[serde(rename = "chipMismatch")]
    pub chip_mismatch: Option<bool>,
    #[serde(rename = "memoryMismatch")]
    pub memory_mismatch: Option<bool>,
    #[serde(rename = "currentChip")]
    pub current_chip: Option<String>,
    #[serde(rename = "currentMemory")]
    pub current_memory: Option<String>,
    #[serde(rename = "configChip")]
    pub config_chip: Option<String>,
    #[serde(rename = "configMemory")]
    pub config_memory: Option<String>,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractedFile {
    pub path: String,
    pub address: String,
    pub name: String,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SftoolParamParseResult {
    pub config: SftoolParamConfig,
    pub validation: ConfigValidationResult,
    #[serde(rename = "extractedFiles")]
    pub extracted_files: Vec<ExtractedFile>,
}
