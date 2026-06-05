import assert from 'node:assert/strict';

const chips = await import('../src/config/chips.ts');

const expectedSupport = {
  SF32LB52: {
    memories: ['NOR', 'NAND', 'SD'],
    interfaces: ['UART'],
  },
  SF32LB55: {
    memories: ['NOR', 'SD'],
    interfaces: ['UART'],
  },
  SF32LB56: {
    memories: ['NOR'],
    interfaces: ['UART', 'USB'],
  },
  SF32LB58: {
    memories: ['NOR'],
    interfaces: ['UART', 'USB'],
  },
};

for (const [chipId, support] of Object.entries(expectedSupport)) {
  assert.deepEqual(chips.getSupportedMemoryTypes(chipId), support.memories, `${chipId} memory support mismatch`);
  assert.deepEqual(chips.getSupportedInterfaces(chipId), support.interfaces, `${chipId} interface support mismatch`);
}

assert.equal(chips.isInterfaceImplemented('UART'), true, 'UART should be implemented');
assert.equal(chips.isInterfaceImplemented('USB'), true, 'USB should be selectable for supported chips');

console.log('chip support matrix ok');
