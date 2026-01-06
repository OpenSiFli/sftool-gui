import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface FlashDevice {
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

export const useStubConfigStore = defineStore('stubConfig', () => {
  const applyStubConfig = ref(false);

  const config = ref<StubConfig>({
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

  const saveConfig = (newConfig: Partial<StubConfig>) => {
    config.value = {
      ...config.value,
      ...newConfig,
    };
  };

  const resetConfig = () => {
    config.value = {
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
    };
  };

  const getConfig = () => {
    return config.value;
  };

  const setApplyStubConfig = (value: boolean) => {
    applyStubConfig.value = value;
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
    isConfigValid,
    saveConfig,
    resetConfig,
    getConfig,
    setApplyStubConfig,
  };
});
