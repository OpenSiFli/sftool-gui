use crate::state::AppState;
use crate::types::ExtractedFile;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;
use tempfile::tempdir;
use unarc_rs::unified::ArchiveFormat;
use walkdir::WalkDir;

#[tauri::command]
pub async fn extract_archive(
    state: State<'_, Mutex<AppState>>,
    archive_path: String,
) -> Result<Vec<ExtractedFile>, String> {
    let path = Path::new(&archive_path);
    if !path.exists() {
        return Err(format!("文件不存在: {}", archive_path));
    }

    // 创建临时目录，并转出 TempDir 的自动删除控制权，让目录在应用关闭前保留
    let dir = tempdir().map_err(|e| format!("无法创建临时目录: {}", e))?;
    let dest_path: PathBuf = dir.into_path();

    // 使用 unarc-rs 解压，支持多种格式 (zip, tar, tar.gz, tar.bz2, rar, 7z 等)
    let mut archive =
        ArchiveFormat::open_path(&archive_path).map_err(|e| format!("打开压缩文件失败: {}", e))?;

    // 遍历压缩文件中的所有条目
    while let Some(entry) = archive
        .next_entry()
        .map_err(|e| format!("读取压缩文件条目失败: {}", e))?
    {
        let entry_name = entry.name();
        let outpath = dest_path.join(entry_name);

        // 判断是否是目录（目录名以 / 结尾）
        if entry_name.ends_with('/') {
            // 创建目录
            fs::create_dir_all(&outpath).map_err(|e| format!("创建目录失败: {}", e))?;
        } else {
            // 创建父目录
            if let Some(parent) = outpath.parent() {
                if !parent.exists() {
                    fs::create_dir_all(parent).map_err(|e| format!("创建目录失败: {}", e))?;
                }
            }

            // 如果输出路径已经存在且是目录，跳过
            if outpath.exists() && outpath.is_dir() {
                println!("跳过目录路径: {:?}", outpath);
                continue;
            }

            // 提取文件
            println!("Extracting file to: {:?} ... ", outpath);
            let mut outfile = fs::File::create(&outpath)
                .map_err(|e| format!("{}: 创建文件失败: {}", entry_name, e))?;
            archive
                .read_to(&entry, &mut outfile)
                .map_err(|e| format!("解压文件失败: {}", e))?;
        }
    }

    // 将临时目录注册到 AppState，以便在应用退出时统一清理
    {
        let mut app_state = state
            .lock()
            .map_err(|e| format!("获取应用状态失败: {}", e))?;
        app_state.register_temp_dir(dest_path.clone());
    }

    // 遍历临时目录，收集文件信息
    let mut extracted = Vec::new();
    for entry in WalkDir::new(&dest_path).into_iter().filter_map(|e| e.ok()) {
        let p = entry.path();
        if p.is_file() {
            if let Ok(meta) = fs::metadata(p) {
                let name = p
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
                extracted.push(ExtractedFile {
                    path: p.to_string_lossy().to_string(),
                    address: "".to_string(),
                    name,
                    size: meta.len(),
                });
            }
        }
    }

    Ok(extracted)
}
