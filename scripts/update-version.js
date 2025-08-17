#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 获取 Git 版本号
 * @returns {string|null} Git 版本号，如果获取失败则返回 null
 */
function getGitVersion() {
  try {
    const version = execSync('git describe --tags --always', { encoding: 'utf8' }).trim();
    return version;
  } catch (error) {
    console.warn('Warning: Failed to get git version:', error.message);
    return null;
  }
}

/**
 * 将 Git 版本号转换为 SemVer 格式
 * @param {string|null} gitVersion Git 版本号
 * @returns {string} SemVer 格式的版本号
 */
function parseToSemVer(gitVersion) {
  if (!gitVersion) {
    return '0.0.1+unknown';
  }

  // v1.0.0 → 1.0.0
  if (gitVersion.startsWith('v')) {
    gitVersion = gitVersion.substring(1);
  }

  // v1.0.0-1-gabcdef → 1.0.0-1+gabcdef
  if (gitVersion.includes('-')) {
    const parts = gitVersion.split('-');
    if (parts.length > 2) {
      // 第一部分是版本号，第二部分是提交数，第三部分是hash
      // 保留第一个 - 用于预发布版本，后续的 - 转换为 +
      return parts[0] + '-' + parts[1] + '+' + parts.slice(2).join('+');
    }
    return gitVersion;
  }

  // 如果是纯 hash，作为 fallback
  if (!/^\d+\.\d+\.\d+/.test(gitVersion)) {
    return `0.0.1+${gitVersion}`;
  }

  return gitVersion;
}
/**
 * 从 SemVer 版本号中提取数字版本号（去掉构建元数据）
 * @param {string} semverVersion SemVer 格式的版本号
 * @returns {string} 数字版本号
 */
function extractNumberVersion(semverVersion) {
  return semverVersion.split('+')[0] || '0.0.1';
}

/**
 * 更新 JSON 文件中的版本号
 * @param {string} filePath 文件路径
 * @param {string} version 新版本号
 * @param {string} fileType 文件类型（用于日志输出）
 * @returns {boolean} 是否进行了更新
 */
function updateJsonVersion(filePath, version, fileType) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(content);
    
    const currentVersion = json.version;
    if (currentVersion === version) {
      console.log(`${fileType} version is up-to-date. No update needed.`);
      return false;
    }

    json.version = version;
    const newContent = JSON.stringify(json, null, 2) + '\n';
    fs.writeFileSync(filePath, newContent, 'utf8');
    
    console.log(`Updated ${fileType} with version: ${version}`);
    return true;
  } catch (error) {
    console.error(`Failed to update ${fileType}:`, error.message);
    process.exit(1);
  }
}

/**
 * 主函数
 */
function main() {
  // 确保在项目根目录运行
  const projectRoot = path.resolve(__dirname, '..');
  process.chdir(projectRoot);

  console.log(`Running version update script from: ${projectRoot}`);

  // 获取 Git 版本号
  const gitVersion = getGitVersion();
  console.log(`Git version: ${gitVersion || 'unknown'}`);

  // 转换为 SemVer 格式
  const semverVersion = parseToSemVer(gitVersion);
  const numberVersion = extractNumberVersion(semverVersion);

  console.log(`Parsed versions - SemVer: ${semverVersion}, Number: ${numberVersion}`);

  // 更新 package.json
  const packageJsonPath = path.join(projectRoot, 'package.json');
  updateJsonVersion(packageJsonPath, semverVersion, 'package.json');

  // 更新 tauri.conf.json
  const tauriConfigPath = path.join(projectRoot, 'src-tauri', 'tauri.conf.json');
  updateJsonVersion(tauriConfigPath, semverVersion, 'tauri.conf.json');

  console.log('Version update completed successfully!');
}

// 如果直接运行此脚本
if (process.argv[1] && process.argv[1].endsWith('update-version.js')) {
  main();
}

export { getGitVersion, parseToSemVer, extractNumberVersion, main };
