import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const srcDir = path.join(projectRoot, 'src');
const localesDir = path.join(srcDir, 'i18n', 'locales');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function flattenKeys(obj, prefix = '') {
  const keys = new Set();
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const nested of flattenKeys(value, fullKey)) {
        keys.add(nested);
      }
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

function walk(dir, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, fileList);
    } else if (entry.isFile() && /\.(vue|ts|js|tsx|jsx)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const localeFiles = fs
  .readdirSync(localesDir)
  .filter(file => file.endsWith('.json'))
  .sort();

if (localeFiles.length === 0) {
  console.error('No locale files found in src/i18n/locales.');
  process.exit(1);
}

const locales = {};
for (const file of localeFiles) {
  const locale = path.basename(file, '.json');
  locales[locale] = flattenKeys(readJson(path.join(localesDir, file)));
}

const keyRegex = /(?:\$t|\bt|i18n\.global\.t)\(\s*(['"`])([^'"`]+?)\1/g;
const files = walk(srcDir);
const usedKeys = new Set();
const dynamicKeys = new Set();

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = keyRegex.exec(content)) !== null) {
    const key = match[2];
    if (key.includes('${')) {
      dynamicKeys.add(key);
      continue;
    }
    usedKeys.add(key);
  }
}

const missingByLocale = {};
for (const [locale, keys] of Object.entries(locales)) {
  const missing = Array.from(usedKeys).filter(key => !keys.has(key)).sort();
  if (missing.length > 0) {
    missingByLocale[locale] = missing;
  }
}

console.log(`Locales: ${Object.keys(locales).join(', ')}`);
console.log(`Used keys: ${usedKeys.size}`);
if (dynamicKeys.size > 0) {
  console.log(`Dynamic template keys skipped: ${dynamicKeys.size}`);
}

if (Object.keys(missingByLocale).length === 0) {
  console.log('No missing keys detected for string-literal usages.');
  process.exit(0);
}

for (const [locale, missing] of Object.entries(missingByLocale)) {
  console.log(`\nMissing in ${locale} (${missing.length}):`);
  for (const key of missing) {
    console.log(`  - ${key}`);
  }
}

process.exit(1);
