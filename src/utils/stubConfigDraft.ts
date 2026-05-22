export type PinPort = 'PA' | 'PB' | 'PBR';
export type PinLevel = 'low' | 'high';

export interface PinItem {
  id: string;
  port: PinPort;
  number: number;
  level: PinLevel;
}

export interface FlashDevice {
  id: string;
  media: 'nor' | 'nand';
  driver_index: number;
  manufacturer_id: string;
  device_type: string;
  density_id: string;
  flags: string;
  nor_dtr?: boolean;
  nand_dual_plane?: boolean;
  nand_page_size?: number;
  nand_block_size?: number;
  nand_ecc_mode?: number;
  capacity_bytes: string | number;
  expanded: boolean;
  capacityError?: string;
  manufacturerIdError?: string;
  deviceTypeError?: string;
  densityIdError?: string;
  flagsError?: string;
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
    scl_port: PinPort;
    scl_pin: number;
    sda_port: PinPort;
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

export const AVAILABLE_PMIC_CHANNELS = [
  '1v8_lvsw100_1',
  '1v8_lvsw100_2',
  '1v8_lvsw100_3',
  '1v8_lvsw100_4',
  '1v8_lvsw100_5',
  'vbat_hvsw150_1',
  'vbat_hvsw150_2',
  'ldo33',
  'ldo30',
  'ldo28',
] as const;

type AnyRecord = Record<string, unknown>;

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const isRecord = (value: unknown): value is AnyRecord => {
  return typeof value === 'object' && value !== null;
};

const normalizeNumber = (value: unknown, fallback = 0) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const isAvailablePmicChannel = (channel: unknown): channel is string => {
  return typeof channel === 'string' && (AVAILABLE_PMIC_CHANNELS as readonly string[]).includes(channel);
};

export const normalizePinPort = (port?: unknown): PinPort => {
  return port === 'PB' || port === 'PBR' ? port : 'PA';
};

export const normalizePinLevel = (level?: unknown): PinLevel => {
  return level === 'high' ? 'high' : 'low';
};

export const createPinItem = (overrides: Partial<PinItem> = {}): PinItem => ({
  id: overrides.id ?? createId(),
  port: normalizePinPort(overrides.port),
  number: normalizeNumber(overrides.number, 0),
  level: normalizePinLevel(overrides.level),
});

export const normalizeHexByteString = (value: unknown, fallback = '') => {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xff) {
    return `0x${value.toString(16).padStart(2, '0')}`;
  }

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return fallback;
};

export const normalizeCapacityValue = (value: unknown) => {
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }

  return '';
};

export const parseFlashCapacityBytes = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0 && value <= 0xffffffff ? value : null;
  }

  const valueStr = String(value).trim();

  const match = valueStr.match(/^(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+)([kKmMgG])?$/);
  if (!match) {
    return null;
  }

  let amount: number;
  const numStr = match[1];
  if (numStr.startsWith('0x')) {
    amount = Number.parseInt(numStr.slice(2), 16);
  } else if (numStr.startsWith('0b')) {
    amount = Number.parseInt(numStr.slice(2), 2);
  } else if (numStr.startsWith('0o')) {
    amount = Number.parseInt(numStr.slice(2), 8);
  } else {
    amount = Number.parseInt(numStr, 10);
  }

  const suffix = match[2]?.toUpperCase();
  const multiplier = suffix === 'K' ? 1000 : suffix === 'M' ? 1000_000 : suffix === 'G' ? 1000_000_000 : 1;
  const bytes = amount * multiplier;

  return Number.isSafeInteger(bytes) && bytes > 0 && bytes <= 0xffffffff ? bytes : null;
};

export const isValidFlashCapacity = (value: unknown) => parseFlashCapacityBytes(value) !== null;

export const parseHexByteValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 && value <= 0xff ? value : null;
  }

  const valueStr = String(value).trim();
  if (!/^0x[0-9a-fA-F]{1,2}$/.test(valueStr)) {
    return null;
  }

  const byte = Number.parseInt(valueStr, 16);
  return byte >= 0 && byte <= 0xff ? byte : null;
};

export const isValidHexByte = (value: unknown) => parseHexByteValue(value) !== null;

export const serializeHexByteValue = (value: unknown) => {
  const parsed = parseHexByteValue(value);
  if (parsed !== null) {
    return parsed;
  }

  return typeof value === 'string' ? value.trim() : value;
};

export const parseHexAddressValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const valueStr = String(value).trim();
  if (!/^0x[0-9a-fA-F]+$/.test(valueStr)) {
    return null;
  }

  const address = Number.parseInt(valueStr, 16);
  return address >= 0 && address <= 0xffffffff ? address : null;
};

export const isValidHexAddress = (value: unknown) => parseHexAddressValue(value) !== null;

export const isValidU8 = (value: unknown) => {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xff;
};

export const hasStubConfigContent = (config: StubConfig) => {
  return (
    (config.pinConfig.enabled && config.pinConfig.items.length > 0) ||
    config.pmicConfig.enabled ||
    config.sdioConfig.enabled ||
    config.flashConfig.devices.length > 0
  );
};

export const isStubConfigValid = (config: StubConfig) => {
  if (!hasStubConfigContent(config)) {
    return false;
  }

  if (config.sdioConfig.enabled) {
    if (config.sdioConfig.addressError || !isValidHexAddress(config.sdioConfig.base_address)) {
      return false;
    }
  }

  if (config.pinConfig.enabled && !config.pinConfig.items.every(item => isValidU8(item.number))) {
    return false;
  }

  if (config.pmicConfig.enabled && (!isValidU8(config.pmicConfig.scl_pin) || !isValidU8(config.pmicConfig.sda_pin))) {
    return false;
  }

  return config.flashConfig.devices.every(device => {
    if (
      device.capacityError ||
      device.manufacturerIdError ||
      device.deviceTypeError ||
      device.densityIdError ||
      device.flagsError
    ) {
      return false;
    }

    return (
      isValidU8(device.driver_index) &&
      isValidFlashCapacity(device.capacity_bytes) &&
      isValidHexByte(device.manufacturer_id) &&
      isValidHexByte(device.device_type) &&
      isValidHexByte(device.density_id) &&
      isValidHexByte(device.flags)
    );
  });
};

export const createFlashDevice = (overrides: Partial<FlashDevice> = {}): FlashDevice => ({
  id: overrides.id ?? createId(),
  media: overrides.media === 'nand' ? 'nand' : 'nor',
  driver_index: normalizeNumber(overrides.driver_index, 0),
  manufacturer_id: overrides.manufacturer_id ?? '',
  device_type: overrides.device_type ?? '',
  density_id: overrides.density_id ?? '',
  flags: overrides.flags ?? '0x00',
  nor_dtr: overrides.nor_dtr ?? false,
  nand_dual_plane: overrides.nand_dual_plane ?? false,
  nand_page_size: overrides.nand_page_size ?? 2048,
  nand_block_size: overrides.nand_block_size ?? 64,
  nand_ecc_mode: overrides.nand_ecc_mode ?? 0,
  capacity_bytes: overrides.capacity_bytes ?? '',
  expanded: overrides.expanded ?? false,
  capacityError: overrides.capacityError ?? '',
  manufacturerIdError: overrides.manufacturerIdError ?? '',
  deviceTypeError: overrides.deviceTypeError ?? '',
  densityIdError: overrides.densityIdError ?? '',
  flagsError: overrides.flagsError ?? '',
});

export const createDefaultStubConfig = (): StubConfig => ({
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

export const parseStubConfigDraft = (draft: unknown): StubConfig => {
  const raw = isRecord(draft) ? draft : {};
  const nextConfig = createDefaultStubConfig();

  if (Array.isArray(raw.pins)) {
    const pins = raw.pins.slice(0, 12).map(pin => {
      const pinRecord = isRecord(pin) ? pin : {};
      return createPinItem({
        port: normalizePinPort(pinRecord.port),
        number: normalizeNumber(pinRecord.number, 0),
        level: normalizePinLevel(pinRecord.level),
      });
    });
    nextConfig.pinConfig.enabled = pins.length > 0;
    nextConfig.pinConfig.items = pins;
  }

  if (isRecord(raw.pmic)) {
    nextConfig.pmicConfig.enabled = true;
    nextConfig.pmicConfig.disabled = Boolean(raw.pmic.disabled);
    nextConfig.pmicConfig.scl_port = normalizePinPort(raw.pmic.scl_port);
    nextConfig.pmicConfig.scl_pin = normalizeNumber(raw.pmic.scl_pin, 0);
    nextConfig.pmicConfig.sda_port = normalizePinPort(raw.pmic.sda_port);
    nextConfig.pmicConfig.sda_pin = normalizeNumber(raw.pmic.sda_pin, 1);
    nextConfig.pmicConfig.channels = Array.isArray(raw.pmic.channels)
      ? raw.pmic.channels.filter(isAvailablePmicChannel)
      : [];
  }

  if (isRecord(raw.sd0)) {
    nextConfig.sdioConfig.enabled = true;
    nextConfig.sdioConfig.base_address = String(raw.sd0.base_address ?? '0x60000000');
    nextConfig.sdioConfig.pinmux = raw.sd0.pinmux === 'clk_pa60_or_pa39' ? 'clk_pa60_or_pa39' : 'clk_pa34_or_pa09';
    nextConfig.sdioConfig.init_sequence = raw.sd0.init_sequence === 'sd_then_emmc' ? 'sd_then_emmc' : 'emmc_then_sd';
    nextConfig.sdioConfig.addressError = '';
  }

  if (Array.isArray(raw.flash)) {
    nextConfig.flashConfig.devices = raw.flash.slice(0, 12).map(flash => {
      const flashRecord = isRecord(flash) ? flash : {};
      return createFlashDevice({
        media: flashRecord.media === 'nand' ? 'nand' : 'nor',
        driver_index: normalizeNumber(flashRecord.driver_index, 0),
        manufacturer_id: normalizeHexByteString(flashRecord.manufacturer_id),
        device_type: normalizeHexByteString(flashRecord.device_type),
        density_id: normalizeHexByteString(flashRecord.density_id),
        flags: normalizeHexByteString(flashRecord.flags),
        capacity_bytes: normalizeCapacityValue(flashRecord.capacity_bytes),
        expanded: false,
      });
    });
  }

  return nextConfig;
};

export const exportStubConfigDraft = (config: StubConfig) => {
  const draft: AnyRecord = {};

  if (config.pinConfig.enabled && config.pinConfig.items.length > 0) {
    draft.pins = config.pinConfig.items.map(item => ({
      port: item.port,
      number: item.number,
      level: item.level,
    }));
  }

  if (config.pmicConfig.enabled) {
    draft.pmic = {
      disabled: config.pmicConfig.disabled,
      scl_port: config.pmicConfig.scl_port,
      scl_pin: config.pmicConfig.scl_pin,
      sda_port: config.pmicConfig.sda_port,
      sda_pin: config.pmicConfig.sda_pin,
      channels: config.pmicConfig.channels,
    };
  }

  if (config.sdioConfig.enabled) {
    draft.sd0 = {
      base_address: config.sdioConfig.base_address,
      pinmux: config.sdioConfig.pinmux,
      init_sequence: config.sdioConfig.init_sequence,
    };
  }

  if (config.flashConfig.devices.length > 0) {
    draft.flash = config.flashConfig.devices.map(device => ({
      media: device.media,
      driver_index: device.driver_index,
      manufacturer_id: serializeHexByteValue(device.manufacturer_id),
      device_type: serializeHexByteValue(device.device_type),
      density_id: serializeHexByteValue(device.density_id),
      flags: serializeHexByteValue(device.flags),
      capacity_bytes: device.capacity_bytes,
    }));
  }

  return draft;
};
