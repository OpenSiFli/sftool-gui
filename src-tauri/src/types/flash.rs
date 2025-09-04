use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct WriteFlashRequest {
    pub files: Vec<WriteFlashFileInfo>,
    pub verify: bool,
    pub no_compress: bool,
    pub erase_all: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WriteFlashFileInfo {
    pub address: u32,
    pub file_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReadFlashRequest {
    pub files: Vec<ReadFlashFileInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReadFlashFileInfo {
    pub file_path: String,
    pub address: u32,
    pub size: u32,
}
