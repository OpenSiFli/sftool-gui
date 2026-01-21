import type { ProgressFinishStatus, ProgressOperation, StubStage } from '../types/progress';

const formatBytes = (bytes: number | undefined): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatAddress = (address: number): string => {
  return `0x${address.toString(16).toUpperCase().padStart(8, '0')}`;
};

const formatStubStage = (stage: StubStage): string => {
  switch (stage) {
    case 'start':
      return '开始';
    case 'signature_key':
      return '签名';
    case 'ram_stub':
      return 'RAM';
    default:
      return '阶段';
  }
};

const formatOperationMessage = (operation: ProgressOperation | undefined): string => {
  if (!operation) return '操作';

  const address = 'address' in operation ? formatAddress(operation.address) : '';
  const size = 'size' in operation ? formatBytes(operation.size) : '';

  switch (operation.kind) {
    case 'connect':
      return '连接设备';
    case 'download_stub':
      return `下载 Stub (${formatStubStage(operation.stage)})`;
    case 'erase_flash':
      return `擦除 Flash @ ${address}`;
    case 'erase_region':
      return `擦除区域 @ ${address} (${formatBytes(operation.len)})`;
    case 'erase_all_regions':
      return '擦除所有区域';
    case 'verify':
      return `验证 @ ${address} (${formatBytes(operation.len)})`;
    case 'check_redownload':
      return `检查重下载 @ ${address} (${size})`;
    case 'write_flash':
      return `写入 @ ${address} (${size})`;
    case 'read_flash':
      return `读取 @ ${address} (${size})`;
    case 'unknown':
    default:
      return '操作';
  }
};

const formatFinishMessage = (status?: ProgressFinishStatus): string => {
  if (!status) return '完成';
  switch (status.kind) {
    case 'success':
      return '完成';
    case 'retry':
      return '需要重试';
    case 'skipped':
      return '已跳过';
    case 'required':
      return '需要重写';
    case 'not_found':
      return '未找到';
    case 'failed':
      return `失败: ${status.message}`;
    case 'aborted':
      return '已中止';
    default:
      return '完成';
  }
};

export { formatAddress, formatBytes, formatFinishMessage, formatOperationMessage };
