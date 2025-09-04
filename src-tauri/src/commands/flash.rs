use crate::types::{WriteFlashRequest, ReadFlashRequest};
use crate::state::AppState;
use sftool_lib::{WriteFlashParams, ReadFlashParams, ReadFlashFile, EraseFlashParams, utils::Utils};
use std::sync::Mutex;
use tauri::State;

#[tauri::command]
pub async fn write_flash(
    state: State<'_, Mutex<AppState>>,
    request: WriteFlashRequest,
) -> Result<(), String> {
    let sftool = {
        let app_state = state.lock().unwrap();
        app_state.sftool.as_ref()
            .ok_or("设备未连接，请先连接设备")?
            .clone()
    };

    // 准备写入文件参数
    let mut files = Vec::new();
    for file_info in request.files {
        // 检查文件是否存在
        if !std::path::Path::new(&file_info.file_path).exists() {
            return Err(format!("文件不存在: {}", file_info.file_path));
        }

        // 根据文件类型和地址构造文件字符串
        let file_string = if file_info.address == 0 {
            // 对于地址为 0 的情况，可能是 ELF/HEX 文件，让 parse_file_info 自动检测
            file_info.file_path.clone()
        } else {
            // 对于指定地址的情况，使用 file@address 格式
            format!("{}@0x{:08X}", file_info.file_path, file_info.address)
        };

        // 使用 Utils::parse_file_info 解析文件
        let parsed_files = Utils::parse_file_info(&file_string)
            .map_err(|e| format!("解析文件 {} 失败: {}", file_info.file_path, e))?;

        files.extend(parsed_files);
    }

    let params = WriteFlashParams {
        files,
        verify: request.verify,
        no_compress: request.no_compress,
        erase_all: request.erase_all,
    };

    let mut tool = sftool.lock().unwrap();
    tool.write_flash(&params)
        .map_err(|e| format!("写入 Flash 失败: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn read_flash(
    state: State<'_, Mutex<AppState>>,
    request: ReadFlashRequest,
) -> Result<(), String> {
    let sftool = {
        let app_state = state.lock().unwrap();
        app_state.sftool.as_ref()
            .ok_or("设备未连接，请先连接设备")?
            .clone()
    };

    // 准备读取文件参数
    let files = request.files.into_iter().map(|file_info| ReadFlashFile {
        file_path: file_info.file_path,
        address: file_info.address,
        size: file_info.size,
    }).collect();

    let params = ReadFlashParams { files };

    let mut tool = sftool.lock().unwrap();
    tool.read_flash(&params)
        .map_err(|e| format!("读取 Flash 失败: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn erase_flash(
    state: State<'_, Mutex<AppState>>,
    address: u32,
) -> Result<(), String> {
    let sftool = {
        let app_state = state.lock().unwrap();
        app_state.sftool.as_ref()
            .ok_or("设备未连接，请先连接设备")?
            .clone()
    };

    let params = EraseFlashParams { address };

    let mut tool = sftool.lock().unwrap();
    tool.erase_flash(&params)
        .map_err(|e| format!("擦除 Flash 失败: {}", e))?;

    Ok(())
}
