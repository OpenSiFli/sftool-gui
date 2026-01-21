import { MessageParser } from './messageParser';
import { formatFinishMessage, formatOperationMessage } from './progressEventFormatter';
import type { ProgressEvent, ProgressOperation } from '../types/progress';

let progressListenerInitialized = false;

type ProgressOperationKind = ProgressOperation['kind'];

const defaultIgnoreKinds: Set<ProgressOperationKind> = new Set(['read_flash', 'write_flash']);

type ProgressLoggerOptions = {
  addMessage: (message: string, important?: boolean) => void;
  ignoreKinds?: Set<ProgressOperationKind>;
  isEnabled?: () => boolean | Promise<boolean>;
};

const shouldIgnoreEvent = (event: ProgressEvent, ignoreKinds: Set<ProgressOperationKind>) => {
  if (event.event_type === 'increment') return true;
  if (!event.operation) return true;
  return ignoreKinds.has(event.operation.kind);
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
      const progressEvent = event.payload;
      if (shouldIgnoreEvent(progressEvent, ignoreKinds)) return;

      const operationName = MessageParser.getOperationNameFromOperation(progressEvent.operation);
      const message =
        progressEvent.event_type === 'finish'
          ? formatFinishMessage(progressEvent.status)
          : formatOperationMessage(progressEvent.operation);

      options.addMessage(`[${operationName}] ${message}`, progressEvent.event_type === 'finish');
    });

    progressListenerInitialized = true;
  } catch (error) {
    console.warn('Failed to setup progress event logger:', error);
  }
};
