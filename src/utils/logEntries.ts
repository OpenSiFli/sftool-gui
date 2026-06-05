import type { LogEntry, LogEntryInput, LogLevel, LogLevelFilter, LogSource } from '../types/log';

const legacyTimestampPattern = /^\[(\d{1,2}:\d{2}:\d{2})\]\s*(.*)$/;

const validLevels: Set<LogLevel> = new Set(['trace', 'debug', 'info', 'warning', 'error', 'success']);
const validSources: Set<LogSource> = new Set([
  'frontend',
  'backend',
  'system',
  'progress',
  'tracing',
  'mass-production',
]);

const createId = () => {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `log-${random}`;
};

const normalizeLevel = (level: unknown, message?: string): LogLevel => {
  if (typeof level === 'string') {
    const normalized = level === 'warn' ? 'warning' : level;
    if (validLevels.has(normalized as LogLevel)) return normalized as LogLevel;
  }

  const lowerMessage = message?.toLowerCase() ?? '';
  if (
    lowerMessage.includes('error') ||
    lowerMessage.includes('failed') ||
    lowerMessage.includes('错误') ||
    lowerMessage.includes('失败')
  ) {
    return 'error';
  }
  if (lowerMessage.includes('warning') || lowerMessage.includes('warn') || lowerMessage.includes('警告')) {
    return 'warning';
  }
  if (
    lowerMessage.includes('success') ||
    lowerMessage.includes('completed') ||
    lowerMessage.includes('成功') ||
    lowerMessage.includes('完成')
  ) {
    return 'success';
  }

  return 'info';
};

const normalizeSource = (source: unknown): LogSource => {
  if (typeof source === 'string' && validSources.has(source as LogSource)) {
    return source as LogSource;
  }
  return 'frontend';
};

const normalizeTimestamp = (timestamp: unknown): string => {
  if (typeof timestamp === 'string' && !Number.isNaN(new Date(timestamp).getTime())) {
    return timestamp;
  }
  if (timestamp instanceof Date && !Number.isNaN(timestamp.getTime())) {
    return timestamp.toISOString();
  }
  return new Date().toISOString();
};

const parseLegacyMessage = (message: string) => {
  const match = legacyTimestampPattern.exec(message);
  if (!match) return { message };

  const [, time, cleanMessage] = match;
  const timestamp = new Date();
  const [hours, minutes, seconds] = time.split(':').map(Number);
  timestamp.setHours(hours, minutes, seconds, 0);

  return {
    message: cleanMessage,
    timestamp: timestamp.toISOString(),
  };
};

export const createLogEntry = (input: LogEntryInput): LogEntry => {
  const parsed = parseLegacyMessage(input.message);
  const message = parsed.message;
  const timestamp = input.timestamp ?? parsed.timestamp;

  return {
    id: input.id ?? createId(),
    timestamp: normalizeTimestamp(timestamp),
    level: normalizeLevel(input.level, message),
    source: normalizeSource(input.source),
    message,
    target: input.target,
    context: input.context,
    important: input.important,
    sessionId: input.sessionId,
    port: input.port,
  };
};

export const normalizeLogEntry = (payload: unknown): LogEntry => {
  if (payload && typeof payload === 'object') {
    const candidate = payload as Partial<LogEntry> & { important?: boolean };
    if (typeof candidate.message === 'string') {
      return createLogEntry({
        id: typeof candidate.id === 'string' ? candidate.id : undefined,
        timestamp: candidate.timestamp,
        level: candidate.level,
        source: candidate.source,
        message: candidate.message,
        target: candidate.target,
        context: candidate.context,
        important: candidate.important,
        sessionId: candidate.sessionId,
        port: candidate.port,
      });
    }
  }

  return createLogEntry({
    level: 'info',
    source: 'frontend',
    message: String(payload ?? ''),
  });
};

export const formatLogEntry = (entry: LogEntry): string => {
  const date = new Date(entry.timestamp);
  const timestamp = Number.isNaN(date.getTime()) ? entry.timestamp : date.toLocaleTimeString();
  const target = entry.target ? ` ${entry.target}` : '';
  return `[${timestamp}] [${entry.level}] [${entry.source}${target}] ${entry.message}`;
};

export const matchesLogLevelFilter = (entry: LogEntry, filter: LogLevelFilter): boolean => {
  if (filter === 'all') return true;
  if (filter === 'error') return entry.level === 'error';
  return entry.level !== 'error';
};

export const getLogEntryTextClass = (entry: LogEntry): string => {
  if (entry.level === 'error') return 'text-error';
  if (entry.level === 'success') return 'text-success';
  if (entry.level === 'warning') return 'text-warning';
  if (entry.level === 'debug' || entry.level === 'trace') return 'text-base-content/70';
  return 'text-base-content';
};

export const getLogEntryFrameClass = (entry: LogEntry): string => {
  if (entry.level === 'error') return 'border-l-error text-error/90 bg-error/5';
  if (entry.level === 'success') return 'border-l-success text-success/90 bg-success/5';
  if (entry.level === 'warning') return 'border-l-warning text-warning/90 bg-warning/5';
  if (entry.level === 'debug' || entry.level === 'trace') {
    return 'border-l-base-300 text-base-content/70 bg-base-100/50';
  }
  return 'border-l-info text-base-content bg-base-100/50';
};

export const getLogEntryIndicatorClass = (entry: LogEntry): string => {
  if (entry.level === 'error') return 'bg-error';
  if (entry.level === 'success') return 'bg-success';
  if (entry.level === 'warning') return 'bg-warning';
  if (entry.level === 'debug' || entry.level === 'trace') return 'bg-base-content/40';
  return 'bg-info';
};
