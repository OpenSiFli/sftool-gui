// 芯片型号配置文件
export type MemoryType = 'NOR' | 'NAND' | 'SD';
export type InterfaceType = 'UART' | 'USB';

export interface ChipModel {
  id: string;
  name: string;
  supportedMemoryTypes: MemoryType[];
  supportedInterfaces: InterfaceType[];
}

export const ALL_INTERFACES: InterfaceType[] = ['UART', 'USB'];

export const CHIP_MODELS: ChipModel[] = [
  {
    id: 'SF32LB52',
    name: 'SF32LB52',
    supportedMemoryTypes: ['NOR', 'NAND', 'SD'],
    supportedInterfaces: ['UART'],
  },
  {
    id: 'SF32LB55',
    name: 'SF32LB55',
    supportedMemoryTypes: ['NOR', 'SD'],
    supportedInterfaces: ['UART'],
  },
  {
    id: 'SF32LB56',
    name: 'SF32LB56',
    supportedMemoryTypes: ['NOR'],
    supportedInterfaces: ['UART', 'USB'],
  },
  {
    id: 'SF32LB57',
    name: 'SF32LB57',
    supportedMemoryTypes: ['NOR'],
    supportedInterfaces: ['UART'],
  },
  {
    id: 'SF32LB58',
    name: 'SF32LB58',
    supportedMemoryTypes: ['NOR'],
    supportedInterfaces: ['UART', 'USB'],
  },
];

export const findChipModel = (chipId?: string | null): ChipModel | null => {
  if (!chipId) return null;
  return CHIP_MODELS.find(chip => chip.id === chipId) || null;
};

export const getSupportedMemoryTypes = (chipId?: string | null): MemoryType[] => {
  return findChipModel(chipId)?.supportedMemoryTypes || ['NOR'];
};

export const getSupportedInterfaces = (chipId?: string | null): InterfaceType[] => {
  return findChipModel(chipId)?.supportedInterfaces || ['UART'];
};

export const isInterfaceImplemented = (interfaceType: string): boolean => {
  return interfaceType === 'UART' || interfaceType === 'USB';
};

export default CHIP_MODELS;
