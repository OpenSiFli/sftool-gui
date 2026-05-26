import { defineStore } from 'pinia';
import { appDataDir } from '@tauri-apps/api/path';
import { exists, readTextFile } from '@tauri-apps/plugin-fs';
import { load } from '@tauri-apps/plugin-store';
import { ref, computed } from 'vue';
import {
  createDefaultStubConfig,
  hasStubConfigContent,
  isStubConfigValid,
  parseStubConfigDraft,
  type StubConfig,
} from '../utils/stubConfigDraft';

export type { FlashDevice, PinItem, StubConfig } from '../utils/stubConfigDraft';

// 存储实例
let runtimeStore: any = null;

const initRuntimeStore = async () => {
  if (!runtimeStore) {
    runtimeStore = await load('stub-settings.json', { autoSave: false, defaults: {} });
  }
  return runtimeStore;
};

const getFileNameFromPath = (path: string) => {
  const normalized = path.replace(/\\/g, '/').trim();
  if (!normalized) {
    return '';
  }

  return normalized.split('/').pop() ?? '';
};

export const useStubConfigStore = defineStore('stubConfig', () => {
  const applyStubConfig = ref(false);
  const applyExternalStub = ref(false);
  const externalStubPath = ref('');
  const externalStubPathExists = ref(false);
  const runtimeSettingsLoaded = ref(false);
  const configDraftLoadedFromLocal = ref(false);
  const configDraftDirty = ref(false);

  const config = ref<StubConfig>(createDefaultStubConfig());

  const saveConfig = (newConfig: Partial<StubConfig>) => {
    config.value = {
      ...config.value,
      ...newConfig,
    };
    configDraftDirty.value = true;
  };

  const resetConfig = () => {
    config.value = createDefaultStubConfig();
    configDraftDirty.value = true;
  };

  const getConfig = () => {
    return config.value;
  };

  const setApplyStubConfig = (value: boolean) => {
    applyStubConfig.value = value;
  };

  const hasExternalStubPath = computed(() => externalStubPath.value.trim().length > 0);

  const externalStubFileName = computed(() => getFileNameFromPath(externalStubPath.value));

  const isExternalStubReady = computed(() => hasExternalStubPath.value && externalStubPathExists.value);

  const refreshExternalStubStatus = async () => {
    const path = externalStubPath.value.trim();

    if (!path) {
      externalStubPathExists.value = false;
      return false;
    }

    try {
      const available = await exists(path);
      externalStubPathExists.value = available;
      return available;
    } catch (error) {
      console.error('检查外部 Stub 文件失败:', error);
      externalStubPathExists.value = false;
      return false;
    }
  };

  const saveRuntimeSettings = async () => {
    try {
      const storeInstance = await initRuntimeStore();
      await storeInstance.set('externalStubPath', { value: externalStubPath.value.trim() });
      await storeInstance.save();
    } catch (error) {
      console.error('保存外部 Stub 设置失败:', error);
    }
  };

  const loadRuntimeSettings = async () => {
    try {
      if (!runtimeSettingsLoaded.value) {
        const storeInstance = await initRuntimeStore();
        const stubPathData = await storeInstance.get('externalStubPath');
        externalStubPath.value = typeof stubPathData?.value === 'string' ? stubPathData.value.trim() : '';
        // 外部 stub 启用状态不持久化，应用重启后默认关闭
        applyExternalStub.value = false;
        runtimeSettingsLoaded.value = true;
      }
      await refreshExternalStubStatus();
    } catch (error) {
      console.error('加载外部 Stub 设置失败:', error);
      externalStubPath.value = '';
      externalStubPathExists.value = false;
      applyExternalStub.value = false;
      runtimeSettingsLoaded.value = true;
    }
  };

  const loadConfigDraftFromLocal = async () => {
    if (configDraftDirty.value || configDraftLoadedFromLocal.value || hasStubConfigContent(config.value)) {
      return false;
    }

    try {
      const dataDir = await appDataDir();
      const configPath = `${dataDir}/stub_config/draft.json`;
      const fileExists = await exists(configPath);

      if (!fileExists) {
        return false;
      }

      const content = await readTextFile(configPath);
      config.value = parseStubConfigDraft(JSON.parse(content));
      configDraftLoadedFromLocal.value = true;
      configDraftDirty.value = false;
      return true;
    } catch (error) {
      console.error('加载 Stub 配置草稿失败:', error);
      return false;
    }
  };

  const setExternalStubPath = async (path: string) => {
    externalStubPath.value = path.trim();
    applyExternalStub.value = false;
    await refreshExternalStubStatus();
    await saveRuntimeSettings();
  };

  const clearExternalStub = async () => {
    externalStubPath.value = '';
    externalStubPathExists.value = false;
    applyExternalStub.value = false;
    await saveRuntimeSettings();
  };

  const setApplyExternalStub = (value: boolean) => {
    if (value && !isExternalStubReady.value) {
      return;
    }

    applyExternalStub.value = value;
  };

  const isConfigValid = computed(() => isStubConfigValid(config.value));

  return {
    config,
    applyStubConfig,
    applyExternalStub,
    externalStubPath,
    externalStubPathExists,
    hasExternalStubPath,
    externalStubFileName,
    isExternalStubReady,
    isConfigValid,
    saveConfig,
    resetConfig,
    getConfig,
    setApplyStubConfig,
    refreshExternalStubStatus,
    saveRuntimeSettings,
    loadRuntimeSettings,
    loadConfigDraftFromLocal,
    setExternalStubPath,
    clearExternalStub,
    setApplyExternalStub,
  };
});
