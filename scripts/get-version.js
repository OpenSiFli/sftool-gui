#!/usr/bin/env node

import { execSync } from 'child_process';

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
function extractNumberVersion(gitVersion) {
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
 * 获取版本信息的脚本，专门用于 GitHub Actions 等 CI/CD 环境
 */
function main() {
  const args = process.argv.slice(2);
  const format = args[0] || 'semver';

  const gitVersion = getGitVersion();
  const semverVersion = parseToSemVer(gitVersion);
  const numberVersion = extractNumberVersion(semverVersion);

  switch (format) {
    case 'git':
      console.log(gitVersion || '0.0.1+unknown');
      break;
    case 'number':
      console.log(numberVersion);
      break;
    case 'semver':
    default:
      console.log(semverVersion);
      break;
  }
}

if (process.argv[1] && process.argv[1].endsWith('get-version.js')) {
  main();
}
