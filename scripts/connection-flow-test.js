import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [source, storeSource, commandSource, deviceTypeSource, toolFactorySource] = await Promise.all([
  readFile(new URL('../src/components/DeviceConnection.vue', import.meta.url), 'utf8'),
  readFile(new URL('../src/stores/deviceStore.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src-tauri/src/commands/device.rs', import.meta.url), 'utf8'),
  readFile(new URL('../src-tauri/src/types/device.rs', import.meta.url), 'utf8'),
  readFile(new URL('../src-tauri/src/utils/tool_factory.rs', import.meta.url), 'utf8'),
]);

assert.doesNotMatch(source, /runWithTimeout/);
assert.match(source, /await invoke<boolean>\('connect_device', connectParams\)/);
assert.match(source, /v-model="compatibilityMode"/);
assert.match(
  source,
  /if \(selectedInterface\.value === 'UART'\) \{[\s\S]*connectParams\.compatibilityMode = compatibilityMode\.value/,
);
assert.match(storeSource, /compatibilityMode: false/);
assert.match(storeSource, /setCompatibilityMode\(enabled: boolean\)/);
assert.match(storeSource, /storeInstance\.get\('compatibilityMode'\)/);
assert.match(storeSource, /storeInstance\.set\('compatibilityMode', \{ value: this\.compatibilityMode \}\)/);
assert.match(commandSource, /compatibility_mode: Option<bool>/);
assert.match(commandSource, /compatibility_mode: compatibility_mode\.unwrap_or\(false\)/);
assert.match(deviceTypeSource, /pub compatibility_mode: bool/);
assert.match(toolFactorySource, /CONNECT_ATTEMPTS,\s+config\.compatibility_mode,/g);

console.log('connection flow preserves active serial operations and forwards UART compatibility mode');
