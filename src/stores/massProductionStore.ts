import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { load } from '@tauri-apps/plugin-store';
import type {
  MassProductionFilterField,
  MassProductionFilterRule,
  MassProductionPortInfo,
  MassProductionPortStatus,
  MassProductionProgressEvent,
  MassProductionSnapshot,
  MassProductionStartRequest,
  MassProductionLogPaths,
} from '../types/massProduction';
import type { MassProductionPortEventType, MassProductionSessionLog } from '../types/massProductionLog';
import type { ProgressOperation } from '../types/progress';

export type FilterField = MassProductionFilterField;
export type FilterType = 'whitelist' | 'blacklist';

const SETTINGS_STORE_FILE = 'massProduction.json';
const LOG_STORE_FILE = 'massProduction-log.json';
const SETTINGS_KEY = 'settings';
const SESSION_LOGS_KEY = 'sessionLogs';
const LOG_RETENTION_DAYS = 30;
const CONCURRENCY_MIN = 1;
const CONCURRENCY_MAX = 32;
const DEFAULT_CONCURRENCY = 8;

let settingsStore: any = null;
let logsStore: any = null;

const initSettingsStore = async () => {
  if (!settingsStore) {
    settingsStore = await load(SETTINGS_STORE_FILE, { autoSave: false });
  }
  return settingsStore;
};

const initLogsStore = async () => {
  if (!logsStore) {
    logsStore = await load(LOG_STORE_FILE, { autoSave: false });
  }
  return logsStore;
};

const now = () => Date.now();

const extractFileName = (path: string) => path.split(/[\\/]/).pop() || path;

const clampConcurrency = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_CONCURRENCY;
  return Math.min(CONCURRENCY_MAX, Math.max(CONCURRENCY_MIN, Math.round(value)));
};

const cleanupLogsByRetention = (logs: MassProductionSessionLog[]) => {
  const cutoff = now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return logs.filter(log => log.startedAt >= cutoff).sort((a, b) => b.startedAt - a.startedAt);
};

const normalizeRules = (rules: unknown): MassProductionFilterRule[] => {
  if (!Array.isArray(rules)) return [];
  return rules
    .map(rule => {
      if (!rule || typeof rule !== 'object') return null;
      const maybeRule = rule as Partial<MassProductionFilterRule>;
      if (!maybeRule.id || !maybeRule.field || typeof maybeRule.value !== 'string') return null;
      if (!['vid_pid', 'serial_number', 'location_path', 'port_name'].includes(maybeRule.field)) {
        return null;
      }
      return {
        id: maybeRule.id,
        field: maybeRule.field,
        value: maybeRule.value,
        enabled: Boolean(maybeRule.enabled),
      } as MassProductionFilterRule;
    })
    .filter((rule): rule is MassProductionFilterRule => rule !== null);
};

const mapPortStatusToEvent = (status: MassProductionPortStatus): MassProductionPortEventType | null => {
  switch (status) {
    case 'queued':
      return 'queued';
    case 'flashing':
      return 'start';
    case 'success':
      return 'success';
    case 'error':
      return 'error';
    case 'disconnected':
      return 'disconnected';
    default:
      return null;
  }
};

const formatOperationLabel = (operation?: ProgressOperation): string => {
  if (!operation) return 'Processing';

  switch (operation.kind) {
    case 'connect':
      return 'Connecting';
    case 'download_stub':
      return 'Downloading stub';
    case 'erase_flash':
      return 'Erasing flash';
    case 'erase_region':
      return 'Erasing region';
    case 'erase_all_regions':
      return 'Erasing all regions';
    case 'verify':
      return 'Verifying';
    case 'check_redownload':
      return 'Checking';
    case 'write_flash':
      return 'Flashing';
    case 'read_flash':
      return 'Reading';
    case 'unknown':
    default:
      return 'Processing';
  }
};

export const useMassProductionStore = defineStore('massProduction', () => {
  const isEnabled = ref(false);
  const isRunning = ref(false);

  const sessionId = ref(0);
  const startedAt = ref<number | null>(null);
  const endedAt = ref<number | null>(null);
  const manualStopped = ref(false);
  const chipModel = ref<string | null>(null);
  const memoryType = ref<string | null>(null);

  const autoDownload = ref(false);
  const maxConcurrency = ref(DEFAULT_CONCURRENCY);

  const whitelist = ref<MassProductionFilterRule[]>([]);
  const blacklist = ref<MassProductionFilterRule[]>([]);
  const isFilterEnabled = ref(true);

  const ports = ref<MassProductionPortInfo[]>([]);
  const queuedCount = ref(0);
  const activeCount = ref(0);
  const successCount = ref(0);
  const failedCount = ref(0);
  const totalCount = ref(0);

  const currentSession = ref<MassProductionSessionLog | null>(null);
  const sessionLogs = ref<MassProductionSessionLog[]>([]);
  const logPaths = ref<MassProductionLogPaths | null>(null);

  const settingsReady = ref(false);
  const pendingFileSummary = ref<string[]>([]);
  const progressCounters = new Map<number, { portName: string; current: number; total: number }>();

  const recentSessionLogs = computed(() => sessionLogs.value.slice(0, 10));

  const saveSettingsToStorage = async () => {
    try {
      const store = await initSettingsStore();
      await store.set(SETTINGS_KEY, {
        value: {
          autoDownload: autoDownload.value,
          maxConcurrency: clampConcurrency(maxConcurrency.value),
          isFilterEnabled: isFilterEnabled.value,
          whitelist: whitelist.value,
          blacklist: blacklist.value,
        },
      });
      await store.save();
    } catch (error) {
      console.error('保存量产配置失败:', error);
    }
  };

  const saveSessionLogsToStorage = async () => {
    try {
      sessionLogs.value = cleanupLogsByRetention(sessionLogs.value);
      const store = await initLogsStore();
      await store.set(SESSION_LOGS_KEY, { value: sessionLogs.value });
      await store.save();
    } catch (error) {
      console.error('保存量产日志失败:', error);
    }
  };

  const loadSettingsFromStorage = async () => {
    try {
      const store = await initSettingsStore();
      const raw = await store.get(SETTINGS_KEY);
      const data = (raw as any)?.value ?? raw;

      if (data && typeof data === 'object') {
        autoDownload.value = Boolean((data as any).autoDownload);
        maxConcurrency.value = clampConcurrency(Number((data as any).maxConcurrency ?? DEFAULT_CONCURRENCY));
        isFilterEnabled.value = (data as any).isFilterEnabled !== false;
        whitelist.value = normalizeRules((data as any).whitelist);
        blacklist.value = normalizeRules((data as any).blacklist);
      }
    } catch (error) {
      console.error('加载量产配置失败:', error);
    }
  };

  const loadSessionLogsFromStorage = async () => {
    try {
      const store = await initLogsStore();
      const raw = await store.get(SESSION_LOGS_KEY);
      const data = (raw as any)?.value ?? raw;
      const loadedLogs = Array.isArray(data) ? (data as MassProductionSessionLog[]) : [];
      sessionLogs.value = cleanupLogsByRetention(loadedLogs);

      if (sessionLogs.value.length !== loadedLogs.length) {
        await saveSessionLogsToStorage();
      }
    } catch (error) {
      console.error('加载量产日志失败:', error);
      sessionLogs.value = [];
    }
  };

  const loadFromStorage = async () => {
    settingsReady.value = false;
    await Promise.all([loadSettingsFromStorage(), loadSessionLogsFromStorage()]);
    settingsReady.value = true;
  };

  watch(
    [autoDownload, maxConcurrency, isFilterEnabled, whitelist, blacklist],
    () => {
      if (!settingsReady.value) return;
      void saveSettingsToStorage();
    },
    { deep: true }
  );

  const ensureCurrentSession = (snapshot: MassProductionSnapshot) => {
    if (snapshot.session_id <= 0) return;

    if (!currentSession.value || currentSession.value.sessionId !== snapshot.session_id) {
      currentSession.value = {
        sessionId: snapshot.session_id,
        startedAt: snapshot.started_at || now(),
        endedAt: snapshot.ended_at || undefined,
        chipModel: snapshot.chip_model || undefined,
        memoryType: snapshot.memory_type || undefined,
        autoDownload: snapshot.auto_download,
        maxConcurrency: snapshot.max_concurrency,
        total: snapshot.total_count,
        success: snapshot.success_count,
        failed: snapshot.failed_count,
        manualStopped: snapshot.manual_stopped,
        fileSummary: pendingFileSummary.value.length > 0 ? [...pendingFileSummary.value] : [],
        portEvents: [],
      };
      pendingFileSummary.value = [];
    }
  };

  const appendPortEvent = (port: MassProductionPortInfo, type: MassProductionPortEventType) => {
    if (!currentSession.value) return;

    const timestamp = now();
    const durationMs =
      port.task_started_at && port.task_finished_at
        ? Math.max(0, port.task_finished_at - port.task_started_at)
        : undefined;

    currentSession.value.portEvents.push({
      id: `${currentSession.value.sessionId}-${port.name}-${type}-${timestamp}`,
      timestamp,
      portName: port.name,
      type,
      message: port.message || undefined,
      durationMs,
      fileSummary: [...currentSession.value.fileSummary],
    });
  };

  const finalizeCurrentSession = async () => {
    if (!currentSession.value) return;

    const finalized: MassProductionSessionLog = {
      ...currentSession.value,
      endedAt: currentSession.value.endedAt || now(),
    };

    const existingIndex = sessionLogs.value.findIndex(log => log.sessionId === finalized.sessionId);
    if (existingIndex >= 0) {
      sessionLogs.value.splice(existingIndex, 1, finalized);
    } else {
      sessionLogs.value.unshift(finalized);
    }

    sessionLogs.value = cleanupLogsByRetention(sessionLogs.value);
    currentSession.value = finalized;
    await saveSessionLogsToStorage();
  };

  const applySnapshot = (snapshot: MassProductionSnapshot) => {
    const previousPorts = new Map(ports.value.map(port => [port.name, port]));

    isRunning.value = snapshot.is_running;
    isEnabled.value = snapshot.is_enabled;

    sessionId.value = snapshot.session_id;
    startedAt.value = snapshot.started_at ?? null;
    endedAt.value = snapshot.ended_at ?? null;
    manualStopped.value = snapshot.manual_stopped;
    chipModel.value = snapshot.chip_model ?? null;
    memoryType.value = snapshot.memory_type ?? null;

    autoDownload.value = snapshot.auto_download;
    maxConcurrency.value = clampConcurrency(snapshot.max_concurrency);

    queuedCount.value = snapshot.queued_count;
    activeCount.value = snapshot.active_count;
    successCount.value = snapshot.success_count;
    failedCount.value = snapshot.failed_count;
    totalCount.value = snapshot.total_count;

    ensureCurrentSession(snapshot);

    ports.value = snapshot.ports || [];

    if (currentSession.value && currentSession.value.sessionId === snapshot.session_id) {
      currentSession.value.startedAt = snapshot.started_at || currentSession.value.startedAt;
      currentSession.value.endedAt = snapshot.ended_at || currentSession.value.endedAt;
      currentSession.value.chipModel = snapshot.chip_model || currentSession.value.chipModel;
      currentSession.value.memoryType = snapshot.memory_type || currentSession.value.memoryType;
      currentSession.value.autoDownload = snapshot.auto_download;
      currentSession.value.maxConcurrency = snapshot.max_concurrency;
      currentSession.value.total = snapshot.total_count;
      currentSession.value.success = snapshot.success_count;
      currentSession.value.failed = snapshot.failed_count;
      currentSession.value.manualStopped = snapshot.manual_stopped;

      for (const port of ports.value) {
        const previousPort = previousPorts.get(port.name);
        const previousStatus = previousPort?.status;
        const previousMessage = previousPort?.message;

        if (previousStatus === port.status) {
          if (port.status === 'error' && previousMessage !== port.message) {
            appendPortEvent(port, 'error');
          }
          continue;
        }

        const eventType = mapPortStatusToEvent(port.status);
        if (eventType) {
          appendPortEvent(port, eventType);
        }
      }
    }

    if (currentSession.value && snapshot.ended_at && currentSession.value.sessionId === snapshot.session_id) {
      void finalizeCurrentSession();
    }
  };

  const applyProgressEvent = (payload: MassProductionProgressEvent) => {
    const port = ports.value.find(item => item.name === payload.port_name);
    if (!port) return;

    const progressEvent = payload.event;

    if (progressEvent.event_type === 'start') {
      let statusChangedToFlashing = false;
      if (port.status === 'queued' || port.status === 'idle') {
        port.status = 'flashing';
        statusChangedToFlashing = true;
      }
      port.message = formatOperationLabel(progressEvent.operation);

      if (progressEvent.progress_type.kind === 'bar') {
        const total = progressEvent.progress_type.total;
        const current = progressEvent.current || 0;
        progressCounters.set(progressEvent.id, {
          portName: payload.port_name,
          current,
          total,
        });

        if (total > 0) {
          port.progress = Math.min(100, Math.round((current * 100) / total));
        }
      }

      if (statusChangedToFlashing) {
        appendPortEvent(port, 'start');
      }
      return;
    }

    if (progressEvent.event_type === 'update') {
      port.message = formatOperationLabel(progressEvent.operation);
      return;
    }

    if (progressEvent.event_type === 'increment') {
      const counter = progressCounters.get(progressEvent.id);
      if (counter && counter.portName === payload.port_name) {
        counter.current += progressEvent.current || 0;
        if (counter.total > 0) {
          port.progress = Math.min(100, Math.round((counter.current * 100) / counter.total));
        }
      }
      return;
    }

    if (progressEvent.event_type === 'finish') {
      progressCounters.delete(progressEvent.id);

      if (progressEvent.status?.kind === 'failed') {
        port.message = progressEvent.status.message;
      } else if (port.status === 'flashing') {
        port.progress = 100;
      }
    }
  };

  const isPortAllowed = (port: Partial<MassProductionPortInfo> & Record<string, any>) => {
    if (!isFilterEnabled.value) return true;

    const matchRule = (
      rule: MassProductionFilterRule,
      currentPort: Partial<MassProductionPortInfo> & Record<string, any>
    ) => {
      if (!rule.enabled || !rule.value.trim()) return false;
      const value = rule.value.toLowerCase();

      switch (rule.field) {
        case 'vid_pid': {
          const vid = (currentPort.vid || '').toString().toLowerCase();
          const pid = (currentPort.pid || '').toString().toLowerCase();
          return vid.includes(value) || pid.includes(value) || `${vid}:${pid}`.includes(value);
        }
        case 'serial_number': {
          const serial = currentPort.serial_number || currentPort.serialNumber || '';
          return serial.toString().toLowerCase().includes(value);
        }
        case 'location_path': {
          const location = currentPort.location_path || currentPort.locationId || '';
          return location.toString().toLowerCase().includes(value);
        }
        case 'port_name':
          return (currentPort.name || '').toString().toLowerCase().includes(value);
        default:
          return false;
      }
    };

    if (blacklist.value.some(rule => matchRule(rule, port))) {
      return false;
    }

    const activeWhitelist = whitelist.value.filter(rule => rule.enabled);
    if (activeWhitelist.length > 0 && !activeWhitelist.some(rule => matchRule(rule, port))) {
      return false;
    }

    return true;
  };

  const addRule = (type: FilterType, rule: Omit<MassProductionFilterRule, 'id'>) => {
    const newRule: MassProductionFilterRule = {
      ...rule,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };

    if (type === 'whitelist') {
      whitelist.value.push(newRule);
    } else {
      blacklist.value.push(newRule);
    }
  };

  const removeRule = (type: FilterType, id: string) => {
    if (type === 'whitelist') {
      whitelist.value = whitelist.value.filter(rule => rule.id !== id);
    } else {
      blacklist.value = blacklist.value.filter(rule => rule.id !== id);
    }
  };

  const updateRule = (type: FilterType, id: string, updates: Partial<MassProductionFilterRule>) => {
    const list = type === 'whitelist' ? whitelist : blacklist;
    const index = list.value.findIndex(rule => rule.id === id);
    if (index >= 0) {
      list.value[index] = {
        ...list.value[index],
        ...updates,
      };
    }
  };

  const setEnabled = (value: boolean) => {
    isEnabled.value = value;
  };

  const setAutoDownload = (value: boolean) => {
    autoDownload.value = value;
  };

  const setMaxConcurrency = (value: number) => {
    maxConcurrency.value = clampConcurrency(value);
  };

  const startMassProduction = async (request: MassProductionStartRequest) => {
    pendingFileSummary.value = request.files.map(file => extractFileName(file.file_path));
    const snapshot = await invoke<MassProductionSnapshot>('mass_production_start', { request });
    applySnapshot(snapshot);
    return snapshot;
  };

  const stopMassProduction = async () => {
    const snapshot = await invoke<MassProductionSnapshot>('mass_production_stop');
    applySnapshot(snapshot);
    return snapshot;
  };

  const refreshMassProduction = async (triggerFlash: boolean) => {
    const snapshot = await invoke<MassProductionSnapshot>('mass_production_refresh', { triggerFlash });
    applySnapshot(snapshot);
    return snapshot;
  };

  const fetchSnapshot = async () => {
    const snapshot = await invoke<MassProductionSnapshot>('mass_production_get_snapshot');
    applySnapshot(snapshot);
    return snapshot;
  };

  const fetchMassProductionLogPaths = async () => {
    const paths = await invoke<MassProductionLogPaths>('mass_production_get_log_paths');
    logPaths.value = paths;
    return paths;
  };

  const openMassProductionLogDirectory = async () => {
    await invoke<void>('mass_production_open_log_directory');
  };

  const clearSessionLogs = async () => {
    sessionLogs.value = [];
    await saveSessionLogsToStorage();
  };

  return {
    isEnabled,
    isRunning,
    sessionId,
    startedAt,
    endedAt,
    manualStopped,
    chipModel,
    memoryType,
    autoDownload,
    maxConcurrency,
    whitelist,
    blacklist,
    isFilterEnabled,
    ports,
    queuedCount,
    activeCount,
    successCount,
    failedCount,
    totalCount,
    currentSession,
    sessionLogs,
    recentSessionLogs,
    logPaths,
    setEnabled,
    setAutoDownload,
    setMaxConcurrency,
    addRule,
    removeRule,
    updateRule,
    isPortAllowed,
    loadFromStorage,
    loadSettingsFromStorage,
    loadSessionLogsFromStorage,
    saveSessionLogsToStorage,
    clearSessionLogs,
    applySnapshot,
    applyProgressEvent,
    startMassProduction,
    stopMassProduction,
    refreshMassProduction,
    fetchSnapshot,
    fetchMassProductionLogPaths,
    openMassProductionLogDirectory,
  };
});
