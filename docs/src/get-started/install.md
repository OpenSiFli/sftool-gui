---
order: 1
title: 安装配置
icon: inbox
---
> 本综合指南涵盖了作为最终用户安装 sftool-gui 应用程序以及为贡献者设置开发环境的内容。sftool-gui 是一款基于 Tauri、Vue 3 和 TypeScript 构建的跨平台 SiFli 系列芯片烧录工具。

## 先决条件

在安装 sftool-gui 之前，请确定您的系统满足基本需求：

| 平台    | 最低要求                          | 备注                             |
| ------- | --------------------------------- | -------------------------------- |
| Windows | Windows 10 或更高版本             | 支持 NSIS 安装程序和便携版       |
| macOS   | macOS 10.15 (Catalina) 或更高版本 | 支持 DMG 和 APP 安装包           |
| Linux   | 任何现代发行版                    | 支持 AppImage、DEB 和 RPM 软件包 |

该应用程序是一个独立的桌面应用程序，正常运行不需要额外的运行时依赖。

## 下载与安装

### 下载应用程序

sftool-gui 为多个平台提供了预构建的安装程序。该应用程序内置更新插件支持自动更新。

#### 下载步骤

1. 访问 [sftool-gui- releases页面](https://github.com/OpenSiFli/sftool-gui/releases)
2. 找到标有 `Latest` 标记的最新版本
3. 在 Assets 部分，为你的操作系统选择合适的安装包：
   - **Windows**: `.exe` (NSIS 安装程序) 或 `-portable.zip` (便携版)
   - **macOS**: `.dmg` (磁盘映像) 或 `.app.tar.gz` (应用程序压缩包)
   - **Linux**: `.AppImage`, `.deb`, 或 `.rpm`

### 安装方式

#### 方式一：标准安装（推荐）

对于 Windows、macOS 和 Linux，使用标准的安装程序包：

| 平台    | 文件扩展名 | 安装过程                                         |
| ------- | ---------- | ------------------------------------------------ |
| Windows | `.exe`     | 运行安装程序并按照向导提示操作                   |
| macOS   | `.dmg`     | 挂载磁盘映像，将应用程序拖至 Applications 文件夹 |
| Linux   | `.deb`     | 使用包管理器：`sudo dpkg -i sftool-gui.deb`      |
| Linux   | `.rpm`     | 使用包管理器：`sudo rpm -i sftool-gui.rpm`       |

安装包配置指定了多种目标格式，以最大限度地兼容不同的 Linux 发行版。

#### 方式二：便携安装（仅限 Windows）

对于不想安装应用程序的 Windows 用户，提供了便携版本：

1. 下载文件名中带有 `portable` 标记的文件
2. 将 zip 压缩包解压到任意目录
3. 直接从解压后的文件夹运行 `sftool.exe`

便携版本无需安装，可以从 U 盘或网络共享位置运行。
