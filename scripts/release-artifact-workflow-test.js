import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflow = await readFile(new URL('../.github/workflows/build.yml', import.meta.url), 'utf8');

assert.doesNotMatch(workflow, /bundle\/(?:nsis|deb|rpm|appimage|dmg).*\$\{\{ env\.VERSION \}\}/);
assert.match(workflow, /Get-ChildItem .*bundle\/nsis/);
assert.match(workflow, /find .*bundle\/deb/);
assert.match(workflow, /find .*bundle\/dmg/);

console.log('release workflow discovers bundle filenames instead of reconstructing them');
