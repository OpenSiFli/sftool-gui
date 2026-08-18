# 开发启动

在项目根目录启动 Tauri 桌面应用。使用项目本地的 Tauri CLI 和 pnpm 10，不依赖全局安装的 `tauri` 或 `pnpm`：

```bash
cd /Users/tieguodundae/Documents/sftool-gui
source ~/.cargo/env
./node_modules/.bin/tauri dev --config '{"build":{"beforeDevCommand":"corepack pnpm@10.19.0 dev"}}'
```

首次启动或缺少 `node_modules` 时，先安装前端依赖：

```bash
corepack pnpm@10.19.0 install --frozen-lockfile
```

只启动前端开发服务器：

```bash
corepack pnpm@10.19.0 dev
```
