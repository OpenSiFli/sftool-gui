---
title: 常见问题
icon: fa-solid fa-comment-dots
---

## 1. Log shows “Connected success!” but “Download stub failed!”

The chip may be in low-power mode and will not respond to serial download
commands. Please refer to [Advanced Features - Behavior
Settings](/zh_CN/Feature/README.md#行为设定) to change the pre-connection action to
“soft reboot”.

## 2. macOS error: "The software is damaged and cannot be opened. You should move it to the Trash."

This error occurs because the software is currently unsigned, causing macOS
security verification to block its execution. You can resolve this by running
the following command in the Terminal:

```bash
xattr -cr /Applications/sftool.app
```
