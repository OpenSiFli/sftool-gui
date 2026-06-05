import { defineStore } from 'pinia';
import { load } from '@tauri-apps/plugin-store';
import type { ChipModel, InterfaceType, MemoryType } from '../config/chips';
import { ALL_INTERFACES, CHIP_MODELS, getSupportedInterfaces, getSupportedMemoryTypes } from '../config/chips';
import type { ConnectionIssue, PortInfo } from '../types/device';
import { findMatchingPort, isPortAvailable, usbIdentityKey } from '../types/device';
// 下载/重启行为类型
export type ResetBeforeMode = 'default_reset' | 'no_reset' | 'no_reset_no_sync';
export type ResetAfterMode = 'soft_reset' | 'no_reset';

// 存储实例
let store: any = null;

// 初始化存储
const initStore = async () => {
  if (!store) {
    store = await load('device-settings.json', { autoSave: false, defaults: {} });
  }
  return store;
};

export const useDeviceStore = defineStore('device', {
  state: () => ({
    // 设备连接状态
    isConnected: false,
    isConnecting: false,
    connectionIssue: null as ConnectionIssue | null,

    // 芯片选择
    selectedChip: null as ChipModel | null,
    chipSearchInput: 'SF32LB52',
    showChipDropdown: false,
    tempChipInput: 'SF32LB52',

    // 存储器类型
    selectedMemoryType: 'NOR' as MemoryType | null,
    memoryTypeInput: 'NOR',
    showMemoryTypeDropdown: false,
    tempMemoryTypeInput: 'NOR',

    // 接口设置
    selectedInterface: 'UART' as InterfaceType,

    // 串口设置
    availablePorts: [] as PortInfo[],
    isLoadingPorts: false,
    selectedPort: null as PortInfo | null,
    portSearchInput: '',
    showPortDropdown: false,
    tempPortInput: '',

    // 波特率设置
    baudRateInput: '1000000',
    showBaudRateDropdown: false,
    tempBaudRateInput: '',
    baudRates: [1000000, 1500000, 3000000, 6000000],

    // 下载行为设置（保存到设备相关设置）
    downloadBehavior: {
      before: 'default_reset' as ResetBeforeMode,
      after: 'no_reset' as ResetAfterMode,
    },
  }),

  getters: {
    // 获取当前芯片可用的存储器类型
    availableMemoryTypes(): MemoryType[] {
      if (!this.selectedChip) return [];
      return getSupportedMemoryTypes(this.selectedChip.id);
    },

    // 获取当前芯片支持的接口类型
    availableInterfaces(): InterfaceType[] {
      if (!this.selectedChip) return [];
      return getSupportedInterfaces(this.selectedChip.id);
    },

    // 所有接口选项，UI 可据此显示禁用态
    interfaceOptions(): InterfaceType[] {
      return ALL_INTERFACES;
    },

    isSelectedInterfaceSupported(): boolean {
      return this.availableInterfaces.includes(this.selectedInterface);
    },

    // 连接验证
    isConnectionValid(): boolean {
      if (!this.selectedChip || !this.selectedMemoryType || !this.isSelectedInterfaceSupported) return false;

      if (this.selectedInterface === 'UART') {
        return !!this.selectedPort && this.selectedPortAvailable && !!this.baudRateInput;
      } else {
        return true; // USB接口不需要其他配置
      }
    },

    selectedPortAvailable(): boolean {
      return isPortAvailable(this.selectedPort, this.availablePorts);
    },

    // 过滤的芯片列表
    filteredChips(): ChipModel[] {
      if (!this.chipSearchInput) return CHIP_MODELS;

      const search = this.chipSearchInput.toLowerCase();
      return CHIP_MODELS.filter(chip => chip.name.toLowerCase().includes(search));
    },

    // 过滤的串口列表
    filteredPorts(): PortInfo[] {
      if (!this.portSearchInput) return this.availablePorts;

      const search = this.portSearchInput.toLowerCase();
      return this.availablePorts.filter(
        port => port.name.toLowerCase().includes(search) || port.port_type.toLowerCase().includes(search)
      );
    },
  },

  actions: {
    // 设置连接状态
    setConnected(connected: boolean) {
      this.isConnected = connected;
      if (connected) {
        this.connectionIssue = null;
      }
      this.saveToStorage();
    },

    setConnecting(connecting: boolean) {
      this.isConnecting = connecting;
    },

    setConnectionIssue(issue: ConnectionIssue | null) {
      this.connectionIssue = issue;
    },

    clearConnectionIssue() {
      this.connectionIssue = null;
    },

    // 设置芯片
    setSelectedChip(chip: ChipModel | null) {
      this.selectedChip = chip;
      if (chip) {
        this.chipSearchInput = chip.name;

        const memoryTypes = getSupportedMemoryTypes(chip.id);
        if (!this.selectedMemoryType || !memoryTypes.includes(this.selectedMemoryType)) {
          this.setSelectedMemoryType(memoryTypes[0] || null);
        } else {
          this.memoryTypeInput = this.selectedMemoryType;
          this.tempMemoryTypeInput = this.selectedMemoryType;
        }

        const interfaces = getSupportedInterfaces(chip.id);
        if (!interfaces.includes(this.selectedInterface)) {
          this.setSelectedInterface(interfaces[0] || 'UART');
        }
      }
      this.saveToStorage();
    },

    // 设置存储器类型
    setSelectedMemoryType(memoryType: MemoryType | null) {
      this.selectedMemoryType = memoryType;
      if (memoryType) {
        this.memoryTypeInput = memoryType;
        this.tempMemoryTypeInput = memoryType;
      } else {
        this.memoryTypeInput = '';
        this.tempMemoryTypeInput = '';
      }
      this.saveToStorage();
    },

    // 设置接口类型
    setSelectedInterface(interfaceType: string) {
      const selectedInterface = interfaceType as InterfaceType;
      if (!this.availableInterfaces.includes(selectedInterface)) return;

      this.selectedInterface = selectedInterface;
      if (selectedInterface !== 'UART') {
        // 如果不是UART接口，重置串口和波特率
        this.selectedPort = null;
        this.portSearchInput = '';
      }
      this.saveToStorage();
    },

    // 设置串口
    setSelectedPort(port: PortInfo | null) {
      this.selectedPort = port;
      if (port) {
        this.portSearchInput = port.name;
      }
      this.connectionIssue = null;
      this.saveToStorage();
    },

    // 设置可用串口列表
    setAvailablePorts(ports: PortInfo[]) {
      this.availablePorts = ports;
    },

    applyAvailablePorts(ports: PortInfo[]) {
      const wasSelectedPortAvailable = isPortAvailable(this.selectedPort, this.availablePorts);
      const previousSelectedPort = this.selectedPort;

      this.availablePorts = ports;

      if (!previousSelectedPort) {
        return {
          selectedPortAvailable: false,
          selectedPortChanged: false,
          selectionRecovered: false,
        };
      }

      const matchedPort = findMatchingPort(previousSelectedPort, ports);
      if (!matchedPort) {
        return {
          selectedPortAvailable: false,
          selectedPortChanged: false,
          selectionRecovered: false,
        };
      }

      const selectedPortChanged =
        matchedPort.name !== previousSelectedPort.name ||
        matchedPort.port_type !== previousSelectedPort.port_type ||
        usbIdentityKey(matchedPort.usb_info) !== usbIdentityKey(previousSelectedPort.usb_info);

      this.selectedPort = matchedPort;
      if (selectedPortChanged) {
        this.portSearchInput = matchedPort.name;
        this.tempPortInput = matchedPort.name;
        this.saveToStorage();
      }

      return {
        selectedPortAvailable: true,
        selectedPortChanged,
        selectionRecovered: !wasSelectedPortAvailable,
      };
    },

    setLoadingPorts(loading: boolean) {
      this.isLoadingPorts = loading;
    },

    // 设置波特率
    setBaudRate(baudRate: string) {
      this.baudRateInput = baudRate;
      this.saveToStorage();
    },

    // 下载行为设置
    setDownloadBeforeBehavior(value: ResetBeforeMode) {
      this.downloadBehavior = { ...this.downloadBehavior, before: value };
      this.saveToStorage();
    },

    setDownloadAfterBehavior(value: ResetAfterMode) {
      this.downloadBehavior = { ...this.downloadBehavior, after: value };
      this.saveToStorage();
    },

    // 下拉框状态管理
    setShowChipDropdown(show: boolean) {
      this.showChipDropdown = show;
    },

    setShowMemoryTypeDropdown(show: boolean) {
      this.showMemoryTypeDropdown = show;
    },

    setShowPortDropdown(show: boolean) {
      this.showPortDropdown = show;
    },

    setShowBaudRateDropdown(show: boolean) {
      this.showBaudRateDropdown = show;
    },

    // 搜索输入管理
    setChipSearchInput(input: string) {
      this.chipSearchInput = input;
    },

    setMemoryTypeInput(input: string) {
      this.memoryTypeInput = input;
    },

    setPortSearchInput(input: string) {
      this.portSearchInput = input;
    },

    // 临时输入管理
    setTempChipInput(input: string) {
      this.tempChipInput = input;
    },

    setTempMemoryTypeInput(input: string) {
      this.tempMemoryTypeInput = input;
    },

    setTempPortInput(input: string) {
      this.tempPortInput = input;
    },

    setTempBaudRateInput(input: string) {
      this.tempBaudRateInput = input;
    },

    // 从存储加载设备设置
    async loadFromStorage() {
      try {
        const storeInstance = await initStore();

        // 加载芯片设置
        const chipData = await storeInstance.get('selectedChip');
        if (chipData?.value) {
          const chip = CHIP_MODELS.find(c => c.id === chipData.value.id);
          if (chip) {
            this.selectedChip = chip;
            this.chipSearchInput = chip.name;
            this.tempChipInput = chip.name;
          }
        } else {
          // 默认选择 SF32LB52
          const defaultChip = CHIP_MODELS.find(chip => chip.id === 'SF32LB52');
          if (defaultChip) {
            this.selectedChip = defaultChip;
          }
        }

        // 加载存储器类型
        const memoryTypeData = await storeInstance.get('selectedMemoryType');
        if (memoryTypeData?.value) {
          const memoryType = memoryTypeData.value as MemoryType;
          if (this.availableMemoryTypes.includes(memoryType)) {
            this.selectedMemoryType = memoryType;
            this.memoryTypeInput = memoryType;
            this.tempMemoryTypeInput = memoryType;
          }
        } else if (this.availableMemoryTypes.length > 0) {
          // 默认选择第一个可用的存储器类型
          this.selectedMemoryType = this.availableMemoryTypes[0];
          this.memoryTypeInput = this.availableMemoryTypes[0];
          this.tempMemoryTypeInput = this.availableMemoryTypes[0];
        }

        // 加载接口类型
        const interfaceData = await storeInstance.get('selectedInterface');
        if (interfaceData?.value && this.availableInterfaces.includes(interfaceData.value)) {
          this.selectedInterface = interfaceData.value;
        } else if (!this.availableInterfaces.includes(this.selectedInterface) && this.availableInterfaces.length > 0) {
          this.selectedInterface = this.availableInterfaces[0];
        }

        // 加载串口设置
        const portData = await storeInstance.get('selectedPort');
        if (portData?.value) {
          this.selectedPort = portData.value;
          this.portSearchInput = portData.value.name;
          this.tempPortInput = portData.value.name;
        }

        // 加载波特率
        const baudRateData = await storeInstance.get('baudRateInput');
        if (baudRateData?.value) {
          this.baudRateInput = baudRateData.value;
        }

        // 加载下载行为设置
        const downloadBehaviorData = await storeInstance.get('downloadBehavior');
        if (downloadBehaviorData?.value) {
          this.downloadBehavior = downloadBehaviorData.value;
        }

        console.log('设备设置已从存储加载');
      } catch (error) {
        console.error('加载设备设置失败:', error);
        // 使用默认值
        const defaultChip = CHIP_MODELS.find(chip => chip.id === 'SF32LB52');
        if (defaultChip) {
          this.selectedChip = defaultChip;
        }
        this.selectedMemoryType = 'NOR';
        this.memoryTypeInput = 'NOR';
      }
    },

    // 保存设备设置到存储
    async saveToStorage() {
      try {
        const storeInstance = await initStore();

        // 保存选中的芯片
        if (this.selectedChip) {
          await storeInstance.set('selectedChip', { value: this.selectedChip });
        }

        // 保存存储器类型
        if (this.selectedMemoryType) {
          await storeInstance.set('selectedMemoryType', { value: this.selectedMemoryType });
        }

        // 保存接口类型
        await storeInstance.set('selectedInterface', { value: this.selectedInterface });

        // 保存串口设置
        if (this.selectedPort) {
          await storeInstance.set('selectedPort', { value: this.selectedPort });
        }

        // 保存波特率
        await storeInstance.set('baudRateInput', { value: this.baudRateInput });

        // 保存下载行为设置
        await storeInstance.set('downloadBehavior', { value: this.downloadBehavior });

        await storeInstance.save();
      } catch (error) {
        console.error('保存设备设置失败:', error);
      }
    },

    // 重置所有设备设置
    async resetDeviceSettings() {
      this.selectedChip = CHIP_MODELS.find(chip => chip.id === 'SF32LB52') || null;
      this.chipSearchInput = 'SF32LB52';
      this.tempChipInput = 'SF32LB52';

      this.selectedMemoryType = 'NOR';
      this.memoryTypeInput = 'NOR';
      this.tempMemoryTypeInput = 'NOR';

      this.selectedInterface = 'UART';

      this.selectedPort = null;
      this.portSearchInput = '';
      this.tempPortInput = '';

      this.baudRateInput = '1000000';

      this.downloadBehavior = { before: 'default_reset', after: 'no_reset' };

      this.isConnected = false;
      this.isConnecting = false;
      this.connectionIssue = null;

      await this.saveToStorage();
    },
  },
});
