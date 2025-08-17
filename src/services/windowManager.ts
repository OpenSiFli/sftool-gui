import { reactive } from 'vue';

interface WindowState {
  isLogWindowOpen: boolean;
}

// 全局窗口状态
export const windowState = reactive<WindowState>({
  isLogWindowOpen: false
});

// 窗口管理服务
export class WindowManager {
  static async openLogWindow() {
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      
      // 检查窗口是否已经存在
      const existingWindow = await WebviewWindow.getByLabel('log-window');
      if (existingWindow) {
        await existingWindow.show();
        await existingWindow.setFocus();
        windowState.isLogWindowOpen = true;
        return existingWindow;
      }

      // 创建新的日志窗口
      const logWindow = new WebviewWindow('log-window', {
        url: '#/log-window',
        title: '日志窗口',
        width: 800,
        height: 500,
        minWidth: 600,
        minHeight: 400,
        resizable: true,
        skipTaskbar: false,
        alwaysOnTop: false,
      });

      // 监听窗口关闭事件
      logWindow.once('tauri://close-requested', () => {
        windowState.isLogWindowOpen = false;
      });

      windowState.isLogWindowOpen = true;
      
      return logWindow;
    } catch (error) {
      console.error('打开日志窗口失败:', error);
      throw error;
    }
  }

  static async closeLogWindow() {
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const logWindow = await WebviewWindow.getByLabel('log-window');
      if (logWindow) {
        await logWindow.close();
        windowState.isLogWindowOpen = false;
      }
    } catch (error) {
      console.error('关闭日志窗口失败:', error);
    }
  }

  static async toggleLogWindow() {
    if (windowState.isLogWindowOpen) {
      await this.closeLogWindow();
    } else {
      await this.openLogWindow();
    }
  }

  static async isLogWindowOpen(): Promise<boolean> {
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const logWindow = await WebviewWindow.getByLabel('log-window');
      return logWindow !== null;
    } catch (error) {
      return false;
    }
  }
}
