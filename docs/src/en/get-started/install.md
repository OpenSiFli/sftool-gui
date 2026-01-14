---
order: 1
title: Installation & Configuration
icon: inbox
---

<script setup>
   const version = __VERSION__
</script>

> This comprehensive guide covers installing the sftool-gui application for end users and setting up the development environment for contributors. sftool-gui is a cross-platform SiFli series chip flashing tool built with Tauri, Vue 3, and TypeScript.

## Prerequisites

Before installing sftool-gui, ensure your system meets the basic requirements:

| Platform | Minimum Requirements | Notes |
| ------- | :------------------ | :---- |
| Windows | Windows 10 or later | Supports NSIS installer and portable version |
| macOS | macOS 10.15 (Catalina) or later | Supports DMG and APP bundles |
| Linux | Any modern distribution | Supports AppImage, DEB, and RPM packages |

The application is a standalone desktop app and does not require additional runtime dependencies.

## Download and Installation

### Download the application

sftool-gui provides prebuilt installers for multiple platforms. The app includes an auto-update plugin supporting automatic updates.

#### GitHub download

1. Visit the [sftool-gui releases page](https://github.com/OpenSiFli/sftool-gui/releases/latest)
2. In the Assets section, choose the installer appropriate for your OS:
    - Windows: `.exe` (NSIS installer) or `-portable.zip` (portable)
    - macOS: `.dmg` (disk image) or `.app.tar.gz` (app archive)
    - Linux: `.AppImage`, `.deb`, or `.rpm`

### Installation methods

#### Method 1: Standard installation (recommended)

For Windows, macOS, and Linux, use the standard installer packages:

| Platform | File extension | Installation process |
| ------- | -------------- | -------------------- |
| Windows | `.exe` | Run the installer and follow the wizard |
| macOS | `.dmg` | Mount the disk image, drag the app to the Applications folder, run `xattr -cr /Applications/sftool.app` in Terminal |
| Linux | `.deb` | Use package manager: `sudo dpkg -i sftool-gui.deb` |
| Linux | `.rpm` | Use package manager: `sudo rpm -i sftool-gui.rpm` |

The installer is configured to produce multiple target formats to maximize compatibility with different Linux distributions.

#### Method 2: Portable (Windows only)

For Windows users who do not want to install the app, a portable version is provided:

1. Download the file marked with `portable`
2. Extract the zip archive to any directory
3. Run `sftool.exe` directly from the extracted folder

The portable version requires no installation and can run from a USB drive or network share.
