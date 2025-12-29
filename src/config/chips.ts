// 芯片型号配置文件
export interface ChipModel {
  id: string;
  name: string;
}

export const CHIP_MODELS: ChipModel[] = [
  {
    id: 'SF32LB52',
    name: 'SF32LB52'
  },
  {
    id: 'SF32LB55',
    name: 'SF32LB55'
  },
  {
    id: 'SF32LB56',
    name: 'SF32LB56'
  },
  {
    id: 'SF32LB58',
    name: 'SF32LB58'
  },
];

export default CHIP_MODELS; 