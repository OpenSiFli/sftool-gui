import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/components/DeviceConnection.vue', import.meta.url), 'utf8');

assert.doesNotMatch(source, /runWithTimeout/);
assert.match(source, /await invoke<boolean>\('connect_device', connectParams\)/);

console.log('connection flow does not abandon active serial operations');
