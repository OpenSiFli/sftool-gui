import { MessageParser } from './messageParser';
import { formatFinishMessage, formatOperationMessage } from './progressEventFormatter';
import type { LogEntryInput, LogLevel } from '../types/log';
import type { ProgressEvent, ProgressOperation } from '../types/progress';

let progressListenerInitialized = false;

type ProgressOperationKind = ProgressOperation['kind'];

const defaultIgnoreKinds: Set<ProgressOperationKind> = new Set(['read_flash', 'write_flash']);

type ProgressLoggerOptions = {
  addMessage: (message: string, important?: boolean) => void;
  addEntry?: (entry: LogEntryInput) => void;
  ignoreKinds?: Set<ProgressOperationKind>;
  isEnabled?: () => boolean | Promise<boolean>;
};

const shouldIgnoreEvent = (event: ProgressEvent, ignoreKinds: Set<ProgressOperationKind>) => {
  if (event.event_type === 'increment') return true;
  if (!event.operation) return true;
  return ignoreKinds.has(event.operation.kind);
};

const getProgressLogLevel = (event: ProgressEvent): LogLevel => {
  if (event.event_type !== 'finish') return 'info';

  switch (event.status?.kind) {
    case 'success':
      return 'success';
    case 'failed':
    case 'aborted':
      return 'error';
    case 'retry':
    case 'required':
    case 'not_found':
      return 'warning';
    case 'skipped':
      return 'info';
    default:
      return 'success';
  }
};

export const progressEventToLogEntry = (
  progressEvent: ProgressEvent,
  ignoreKinds: Set<ProgressOperationKind> = defaultIgnoreKinds
): LogEntryInput | null => {
  if (shouldIgnoreEvent(progressEvent, ignoreKinds)) return null;

  const operationName = MessageParser.getOperationNameFromOperation(progressEvent.operation);
  const message =
    progressEvent.event_type === 'finish'
      ? formatFinishMessage(progressEvent.status)
      : formatOperationMessage(progressEvent.operation);

  return {
    level: getProgressLogLevel(progressEvent),
    source: 'progress',
    message: `[${operationName}] ${message}`,
    important: progressEvent.event_type === 'finish',
    context: {
      progressId: progressEvent.id,
      eventType: progressEvent.event_type,
      step: progressEvent.step,
      operationKind: progressEvent.operation.kind,
      statusKind: progressEvent.status?.kind,
    },
  };
};

export const setupProgressEventLogger = async (options: ProgressLoggerOptions) => {
  if (progressListenerInitialized) return;

  const isEnabled = options.isEnabled ? await options.isEnabled() : true;
  if (!isEnabled) {
    progressListenerInitialized = true;
    return;
  }

  try {
    const { listen } = await import('@tauri-apps/api/event');
    const ignoreKinds = options.ignoreKinds ?? defaultIgnoreKinds;

    await listen<ProgressEvent>('flash-progress', event => {
      const entry = progressEventToLogEntry(event.payload, ignoreKinds);
      if (!entry) return;

      if (options.addEntry) {
        options.addEntry(entry);
      } else {
        options.addMessage(entry.message, entry.important);
      }
    });

    progressListenerInitialized = true;
  } catch (error) {
    console.warn('Failed to setup progress event logger:', error);
  }
};
