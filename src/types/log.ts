export type LogLevel = 'trace' | 'debug' | 'info' | 'warning' | 'error' | 'success';

export type LogSource = 'frontend' | 'backend' | 'system' | 'progress' | 'tracing' | 'mass-production';

export type LogLevelFilter = 'all' | 'info' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  target?: string;
  context?: Record<string, unknown>;
  important?: boolean;
  sessionId?: string;
  port?: string;
}

export type LogEntryInput = Omit<LogEntry, 'id' | 'timestamp' | 'level' | 'source'> &
  Partial<Pick<LogEntry, 'id' | 'timestamp' | 'level' | 'source'>>;
