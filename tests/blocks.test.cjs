const { test } = require('node:test');
const assert = require('node:assert/strict');
const { insert, catalog } = require('../blocks.js');
const { parse, LIMITS } = require('../engine.js');

test('every ready block produces a real engine node, including an empty editor', () => {
  for (const block of catalog) {
    const result = insert('', block.kind);
    const model = parse(result.source);
    assert.equal(model.nodes.length, 1);
    assert.equal(model.nodes[0].kind, block.kind);
    assert.equal(result.source.slice(result.start, result.end), block.label);
  }
});
test('repeated insertion preserves existing code and connections with unique identifiers', () => {
  const source = 'diagram "Test" {\n server server1 "Esistente"\n database db\n server1 -> db\n}\n';
  const once = insert(source, 'server');
  const twice = insert(once.source, 'server');
  const model = parse(twice.source);
  assert.equal(once.id, 'server2');
  assert.equal(twice.id, 'server3');
  assert.equal(model.nodes.length, 4);
  assert.equal(model.edges.length, 1);
  assert.ok(twice.source.includes(' server1 -> db\n'));
});
test('insertion handles nested blocks, braces in labels and trailing comments', () => {
  const source = 'diagram "} Test" {\r\n zone "} Gruppo" {\r\n node a "} Nodo"\r\n }\r\n} // finale\r\n# }\r\n// }';
  const result = insert(source, 'decision');
  const model = parse(result.source);
  assert.equal(model.nodes.length, 2);
  assert.equal(model.nodes[1].parent, model);
  assert.ok(result.source.endsWith('# }\r\n// }'));
});
test('invalid code and unrecognized blocks fail before producing a replacement', () => {
  assert.throws(() => insert('diagram "Errore" {\n a -> b\n}', 'server'), /non dichiarato/);
  assert.throws(() => insert('', 'constructor'), /non disponibile/);
});
test('ready blocks respect the same engine limits as typed input', () => {
  const full = 'diagram "Limite" {\n' + Array.from({length: LIMITS.nodes}, (_, i) => 'node n' + i).join('\n') + '\n}';
  assert.throws(() => insert(full, 'server'), /250 elementi/);
});
