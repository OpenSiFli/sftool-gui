import { defineStore } from 'pinia';
import { load } from "@tauri-apps/plugin-store";
import type { ChipModel } from '../config/chips';
import { CHIP_MODELS } from '../config/chips';

interface PortInfo {
  name: string;
  port_type: string;
}

// 存储实例
let store: any = null;

// 初始化存储
const initStore = async () => {
  if (!store) {
    store = await load('device-settings.json', { autoSave: false });
  }
  return store;
};

export const useDeviceStore = defineStore('device', {
  state: () => ({
    // 设备连接状态
    isConnected: false,
    isConnecting: false,
    
    // 芯片选择
    selectedChip: null as ChipModel | null,
    chipSearchInput: 'SF32LB52',
    showChipDropdown: false,
    tempChipInput: 'SF32LB52',
    
    // 存储器类型
    selectedMemoryType: 'NOR' as string | null,
    memoryTypeInput: 'NOR',
    showMemoryTypeDropdown: false,
    tempMemoryTypeInput: 'NOR',
    
    // 接口设置
    selectedInterface: 'UART',
    
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
    
    // 芯片与存储器映射
    chipMemoryTypes: {
      'SF32LB52': ['NOR', 'NAND', 'SD'],
      'default': ['NOR']
    } as Record<string, string[]>
  }),

  getters: {
    // 获取当前芯片可用的存储器类型
    availableMemoryTypes(): string[] {
      if (!this.selectedChip) return [];
      return this.chipMemoryTypes[this.selectedChip.id as keyof typeof this.chipMemoryTypes] || this.chipMemoryTypes.default;
    },

    // 连接验证
    isConnectionValid(): boolean {
      if (!this.selectedChip || !this.selectedMemoryType) return false;
      
      if (this.selectedInterface === 'UART') {
        return !!this.selectedPort && !!this.baudRateInput;
      } else {
        return true; // USB接口不需要其他配置
      }
    },

    // 过滤的芯片列表
    filteredChips(): ChipModel[] {
      if (!this.chipSearchInput) return CHIP_MODELS;
      
      const search = this.chipSearchInput.toLowerCase();
      return CHIP_MODELS.filter(chip => 
        chip.name.toLowerCase().includes(search)
      );
    },

    // 过滤的串口列表
    filteredPorts(): PortInfo[] {
      if (!this.portSearchInput) return this.availablePorts;
      
      const search = this.portSearchInput.toLowerCase();
      return this.availablePorts.filter(port => 
        port.name.toLowerCase().includes(search) ||
        port.port_type.toLowerCase().includes(search)
      );
    }
  },

  actions: {
    // 设置连接状态
    setConnected(connected: boolean) {
      this.isConnected = connected;
      this.saveToStorage();
    },

    setConnecting(connecting: boolean) {
      this.isConnecting = connecting;
    },

    // 设置芯片
    setSelectedChip(chip: ChipModel | null) {
      this.selectedChip = chip;
      if (chip) {
        this.chipSearchInput = chip.name;
        // 重置存储器类型
        this.selectedMemoryType = null;
        this.memoryTypeInput = '';
        
        // 如果只有一种存储器类型，则自动选择
        if (this.availableMemoryTypes.length === 1) {
          this.setSelectedMemoryType(this.availableMemoryTypes[0]);
        }
      }
      this.saveToStorage();
    },

    // 设置存储器类型
    setSelectedMemoryType(memoryType: string | null) {
      this.selectedMemoryType = memoryType;
      if (memoryType) {
        this.memoryTypeInput = memoryType;
      }
      this.saveToStorage();
    },

    // 设置接口类型
    setSelectedInterface(interfaceType: string) {
      this.selectedInterface = interfaceType;
      if (interfaceType !== 'UART') {
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
      this.saveToStorage();
    },

    // 设置可用串口列表
    setAvailablePorts(ports: PortInfo[]) {
      this.availablePorts = ports;
    },

    setLoadingPorts(loading: boolean) {
      this.isLoadingPorts = loading;
    },

    // 设置波特率
    setBaudRate(baudRate: string) {
      this.baudRateInput = baudRate;
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
          this.selectedMemoryType = memoryTypeData.value;
          this.memoryTypeInput = memoryTypeData.value;
          this.tempMemoryTypeInput = memoryTypeData.value;
        } else if (this.availableMemoryTypes.length > 0) {
          // 默认选择第一个可用的存储器类型
          this.selectedMemoryType = this.availableMemoryTypes[0];
          this.memoryTypeInput = this.availableMemoryTypes[0];
          this.tempMemoryTypeInput = this.availableMemoryTypes[0];
        }

        // 加载接口类型
        const interfaceData = await storeInstance.get('selectedInterface');
        if (interfaceData?.value) {
          this.selectedInterface = interfaceData.value;
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
      
      this.isConnected = false;
      this.isConnecting = false;
      
      await this.saveToStorage();
    }
  }
});
