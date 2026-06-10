import type { LogLevelFilter } from '../types/log';

export const DEFAULT_LOG_MAX_ENTRIES = 1000;
export const MIN_LOG_MAX_ENTRIES = 100;
export const MAX_LOG_MAX_ENTRIES = 10000;

export interface LogSettings {
  maxEntries: number;
  levelFilter: LogLevelFilter;
}

const validLevelFilters = new Set<LogLevelFilter>(['all', 'info', 'error']);

export const normalizeLogSettings = (value: Partial<LogSettings> | null | undefined): LogSettings => {
  const rawMaxEntries = Number(value?.maxEntries ?? DEFAULT_LOG_MAX_ENTRIES);
  const maxEntries = Number.isFinite(rawMaxEntries)
    ? Math.min(MAX_LOG_MAX_ENTRIES, Math.max(MIN_LOG_MAX_ENTRIES, Math.round(rawMaxEntries)))
    : DEFAULT_LOG_MAX_ENTRIES;

  const levelFilter = validLevelFilters.has(value?.levelFilter as LogLevelFilter)
    ? (value?.levelFilter as LogLevelFilter)
    : 'all';

  return {
    maxEntries,
    levelFilter,
  };
};
