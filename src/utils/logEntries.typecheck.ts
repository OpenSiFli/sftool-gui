import {
  createLogEntry,
  formatLogEntry,
  getLogEntryFrameClass,
  getLogEntryIndicatorClass,
  getLogEntryTextClass,
  matchesLogLevelFilter,
  normalizeLogEntry,
} from './logEntries';
import type { LogEntry, LogLevelFilter } from '../types/log';

const created: LogEntry = createLogEntry({
  level: 'error',
  source: 'frontend',
  message: '连接失败',
  important: true,
});

const normalized: LogEntry = normalizeLogEntry({
  message: '[12:00:00] 连接失败',
  important: true,
});

const formatted: string = formatLogEntry(created);
const filter: LogLevelFilter = 'error';
const matchesErrorFilter: boolean = matchesLogLevelFilter(created, filter);
const textClass: string = getLogEntryTextClass(created);
const frameClass: string = getLogEntryFrameClass(created);
const indicatorClass: string = getLogEntryIndicatorClass(normalized);

export const logEntryTypeChecks = {
  created,
  normalized,
  formatted,
  matchesErrorFilter,
  textClass,
  frameClass,
  indicatorClass,
};
