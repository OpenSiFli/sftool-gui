import { defineStore } from 'pinia';
import { exists } from '@tauri-apps/plugin-fs';
import { load } from '@tauri-apps/plugin-store';
import { ref, computed } from 'vue';

export interface FlashDevice {
  id: string;
  media: 'nor' | 'nand';
  driver_index: number;
  manufacturer_id: string;
  device_type: string;
  density_id: string;
  flags: string;
  capacity_bytes: string | number;
  expanded: boolean;
  capacityError?: string;
  manufacturerIdError?: string;
  deviceTypeError?: string;
  densityIdError?: string;
  flagsError?: string;
}

export interface PinItem {
  id: string;
  port: 'PA' | 'PB' | 'PBR';
  number: number;
  level: 'low' | 'high';
}

export interface StubConfig {
  currentTab: 'hardware' | 'storage';
  pinConfig: {
    enabled: boolean;
    expanded: boolean;
    items: PinItem[];
  };
  pmicConfig: {
    enabled: boolean;
    expanded: boolean;
    disabled: boolean;
    scl_port: 'PA' | 'PB' | 'PBR';
    scl_pin: number;
    sda_port: 'PA' | 'PB' | 'PBR';
    sda_pin: number;
    channels: string[];
  };
  sdioConfig: {
    enabled: boolean;
    expanded: boolean;
    base_address: string;
    pinmux: 'clk_pa34_or_pa09' | 'clk_pa60_or_pa39';
    init_sequence: 'emmc_then_sd' | 'sd_then_emmc';
    addressError: string;
  };
  flashConfig: {
    expanded: boolean;
    devices: FlashDevice[];
  };
}

// 存储实例
let runtimeStore: any = null;

const initRuntimeStore = async () => {
  if (!runtimeStore) {
    runtimeStore = await load('stub-settings.json', { autoSave: false, defaults: {} });
  }
  return runtimeStore;
};

const createDefaultConfig = (): StubConfig => ({
  currentTab: 'storage',
  pinConfig: {
    enabled: false,
    expanded: true,
    items: [],
  },
  pmicConfig: {
    enabled: false,
    expanded: true,
    disabled: false,
    scl_port: 'PA',
    scl_pin: 0,
    sda_port: 'PA',
    sda_pin: 1,
    channels: [],
  },
  sdioConfig: {
    enabled: false,
    expanded: true,
    base_address: '0x68000000',
    pinmux: 'clk_pa34_or_pa09',
    init_sequence: 'emmc_then_sd',
    addressError: '',
  },
  flashConfig: {
    expanded: true,
    devices: [],
  },
});

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

  const config = ref<StubConfig>(createDefaultConfig());

  const saveConfig = (newConfig: Partial<StubConfig>) => {
    config.value = {
      ...config.value,
      ...newConfig,
    };
  };

  const resetConfig = () => {
    config.value = createDefaultConfig();
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

  // 验证配置是否有效
  const isConfigValid = computed(() => {
    // 至少配置了一项
    const hasConfig =
      config.value.pinConfig.items.length > 0 ||
      (config.value.pmicConfig.enabled && !config.value.pmicConfig.disabled) ||
      config.value.sdioConfig.enabled ||
      config.value.flashConfig.devices.length > 0;

    if (!hasConfig) {
      return false;
    }

    // 检查SDIO配置
    if (config.value.sdioConfig.enabled) {
      // 检查基地址是否为空或有错误
      if (!config.value.sdioConfig.base_address || config.value.sdioConfig.addressError) {
        return false;
      }
    }

    // 检查Flash设备配置
    if (config.value.flashConfig.devices.length > 0) {
      const hasFlashError = config.value.flashConfig.devices.some(device => {
        // 检查是否有验证错误
        if (
          device.capacityError ||
          device.manufacturerIdError ||
          device.deviceTypeError ||
          device.densityIdError ||
          device.flagsError
        ) {
          return true;
        }

        // 检查必填字段是否为空
        if (
          !device.capacity_bytes ||
          !device.manufacturer_id ||
          !device.device_type ||
          !device.density_id ||
          !device.flags
        ) {
          return true;
        }

        return false;
      });

      if (hasFlashError) {
        return false;
      }
    }

    // 检查PMIC配置
    if (config.value.pmicConfig.enabled && !config.value.pmicConfig.disabled) {
      // PMIC的引脚配置不能为空（scl_pin和sda_pin的默认值是0，这是有效的）
      // 通道可以为空数组，这是允许的
    }

    return true;
  });

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
    setExternalStubPath,
    clearExternalStub,
    setApplyExternalStub,
  };
});
