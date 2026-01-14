---
title: 常见问题
icon: fa-solid fa-comment-dots
---

## 1. 日志提示“Connected success!”但是“Download stub failed!”

可能是芯片当前处于低功耗模式，此时芯片不会响应串口下载指令，请参考[进阶功能-行为设定](/Feature/README.md#行为设定)将连接前行为改为“软重启”