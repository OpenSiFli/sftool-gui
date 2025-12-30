import { reactive } from 'vue';
import { t } from './i18nHelper';

interface WindowState {
  isLogWindowOpen: boolean;
}

// 全局窗口状态
export const windowState = reactive<WindowState>({
  isLogWindowOpen: false,
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
        title: t('deviceConnection.openLogWindow'),
        width: 800,
        height: 500,
        minWidth: 600,
        minHeight: 400,
        resizable: true,
        skipTaskbar: false,
        alwaysOnTop: false,
      });

      // 不监听 close-requested 事件，让窗口自然关闭
      // 只监听窗口被销毁事件来更新状态
      logWindow.once('tauri://destroyed', () => {
        windowState.isLogWindowOpen = false;
      });

      // 窗口创建完成后请求同步现有日志数据
      logWindow.once('tauri://created', async () => {
        try {
          // 延迟一点确保日志窗口完全加载
          setTimeout(async () => {
            const { emit } = await import('@tauri-apps/api/event');
            await emit('log-sync-request', {});
          }, 500);
        } catch (error) {
          console.warn('Failed to request log sync:', error);
        }
      });

      windowState.isLogWindowOpen = true;

      return logWindow;
    } catch (error) {
      console.error(t('errors.openLogWindowFailed') || 'Failed to open log window:', error);
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
    } catch (_error) {
      return false;
    }
  }
}
