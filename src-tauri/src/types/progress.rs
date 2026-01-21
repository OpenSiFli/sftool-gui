use serde::{Deserialize, Serialize};
use sftool_lib::progress;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum TauriProgressType {
    Spinner,
    Bar { total: u64 },
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum TauriStubStage {
    Start,
    SignatureKey,
    RamStub,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum TauriEraseFlashStyle {
    Complete,
    Addressed,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub enum TauriEraseRegionStyle {
    LegacyFlashStartDecimalLength,
    HexLength,
    Range,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum TauriProgressOperation {
    Connect,
    DownloadStub {
        stage: TauriStubStage,
    },
    EraseFlash {
        address: u32,
        style: TauriEraseFlashStyle,
    },
    EraseRegion {
        address: u32,
        len: u32,
        style: TauriEraseRegionStyle,
    },
    EraseAllRegions,
    Verify {
        address: u32,
        len: u32,
    },
    CheckRedownload {
        address: u32,
        size: u64,
    },
    WriteFlash {
        address: u32,
        size: u64,
    },
    ReadFlash {
        address: u32,
        size: u32,
    },
    Unknown,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TauriProgressContext {
    pub step: i32,
    pub progress_type: TauriProgressType,
    pub operation: TauriProgressOperation,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "kind", content = "message", rename_all = "snake_case")]
pub enum TauriProgressStatus {
    Success,
    Retry,
    Skipped,
    Required,
    NotFound,
    Failed(String),
    Aborted,
}

// Tauri 进度事件结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TauriProgressEvent {
    pub id: u64,
    pub event_type: String, // "start", "update", "increment", "finish"
    pub step: i32,
    pub progress_type: TauriProgressType,
    pub operation: TauriProgressOperation,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<TauriProgressStatus>,
}

impl From<progress::ProgressType> for TauriProgressType {
    fn from(value: progress::ProgressType) -> Self {
        match value {
            progress::ProgressType::Spinner => Self::Spinner,
            progress::ProgressType::Bar { total } => Self::Bar { total },
        }
    }
}

impl From<progress::StubStage> for TauriStubStage {
    fn from(value: progress::StubStage) -> Self {
        match value {
            progress::StubStage::Start => Self::Start,
            progress::StubStage::SignatureKey => Self::SignatureKey,
            progress::StubStage::RamStub => Self::RamStub,
        }
    }
}

impl From<progress::EraseFlashStyle> for TauriEraseFlashStyle {
    fn from(value: progress::EraseFlashStyle) -> Self {
        match value {
            progress::EraseFlashStyle::Complete => Self::Complete,
            progress::EraseFlashStyle::Addressed => Self::Addressed,
        }
    }
}

impl From<progress::EraseRegionStyle> for TauriEraseRegionStyle {
    fn from(value: progress::EraseRegionStyle) -> Self {
        match value {
            progress::EraseRegionStyle::LegacyFlashStartDecimalLength => {
                Self::LegacyFlashStartDecimalLength
            }
            progress::EraseRegionStyle::HexLength => Self::HexLength,
            progress::EraseRegionStyle::Range => Self::Range,
        }
    }
}

impl From<progress::ProgressOperation> for TauriProgressOperation {
    fn from(value: progress::ProgressOperation) -> Self {
        match value {
            progress::ProgressOperation::Connect => Self::Connect,
            progress::ProgressOperation::DownloadStub { stage } => Self::DownloadStub {
                stage: stage.into(),
            },
            progress::ProgressOperation::EraseFlash { address, style } => Self::EraseFlash {
                address,
                style: style.into(),
            },
            progress::ProgressOperation::EraseRegion {
                address,
                len,
                style,
            } => Self::EraseRegion {
                address,
                len,
                style: style.into(),
            },
            progress::ProgressOperation::EraseAllRegions => Self::EraseAllRegions,
            progress::ProgressOperation::Verify { address, len } => Self::Verify { address, len },
            progress::ProgressOperation::CheckRedownload { address, size } => {
                Self::CheckRedownload { address, size }
            }
            progress::ProgressOperation::WriteFlash { address, size } => {
                Self::WriteFlash { address, size }
            }
            progress::ProgressOperation::ReadFlash { address, size } => {
                Self::ReadFlash { address, size }
            }
        }
    }
}

impl From<progress::ProgressContext> for TauriProgressContext {
    fn from(value: progress::ProgressContext) -> Self {
        Self {
            step: value.step,
            progress_type: value.progress_type.into(),
            operation: value.operation.into(),
        }
    }
}

impl From<progress::ProgressStatus> for TauriProgressStatus {
    fn from(value: progress::ProgressStatus) -> Self {
        match value {
            progress::ProgressStatus::Success => Self::Success,
            progress::ProgressStatus::Retry => Self::Retry,
            progress::ProgressStatus::Skipped => Self::Skipped,
            progress::ProgressStatus::Required => Self::Required,
            progress::ProgressStatus::NotFound => Self::NotFound,
            progress::ProgressStatus::Failed(message) => Self::Failed(message),
            progress::ProgressStatus::Aborted => Self::Aborted,
        }
    }
}
