const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parse, render } = require('../engine.js');
const examples = require('../examples.js');
for (const [name, source] of Object.entries(examples)) test('render example: ' + name, () => {
  const { svg, model } = render(source);
  assert.ok(svg.startsWith('<svg')); assert.ok(svg.endsWith('</svg>'));
  assert.ok(model.w > 0 && model.h > 0);
  for (const n of model.nodes) { assert.ok(Number.isFinite(n.ax)); assert.ok(Number.isFinite(n.ay)); assert.ok(n.ax >= 0 && n.ay >= 0); assert.ok(n.ax + n.w <= model.w); assert.ok(n.ay + n.h <= model.h); }
});
test('forward references, chains, comments and quoted punctuation', () => {
  const m = parse('diagram "x" {\n a -> b -> c : "https://host/a:#x"\n node a "A"\n node b\n node c\n} // done');
  assert.equal(m.edges.length, 2); assert.equal(m.edges[1].label, 'https://host/a:#x');
});
test('line numbers for duplicate and unresolved identifiers', () => {
  assert.throws(() => parse('diagram "x" {\nnode a\nnode a\n}'), e => e.line === 3 && /duplicato/.test(e.message));
  assert.throws(() => parse('diagram "x" {\na -> b\nnode a\n}'), e => e.line === 2 && /non dichiarato/.test(e.message));
});
test('invalid blocks and syntax fail explicitly', () => {
  for (const s of ['diagram "x" {\nnode a', 'diagram "x" {\n}\nnode a', 'diagram "x" {\nserver a {\nbogus = "x"\n}\n}', 'diagram "x" {\nnode a\na ->\n}', 'diagram "x" {\nnode a "unterminated\n}']) assert.throws(() => parse(s));
});
test('cycles and self loops render without invalid coordinates', () => {
  const { svg, model } = render('diagram "Cycle" {\nnode a\nnode b\nnode c\na -> b\nb -> a\nb -> c\nc -> c : retry\n}');
  assert.equal(model.edges.length, 4); assert.ok(!/NaN|Infinity/.test(svg));
});
test('SVG escapes user text and rejects injected color values', () => {
  const { svg } = render('diagram "<script>" {\nnode a "<img onerror=alert(1)>"\n}');
  assert.ok(!svg.includes('<script>')); assert.ok(!svg.includes('<img')); assert.ok(svg.includes('&lt;img'));
  assert.throws(() => parse('diagram "x" {\nnode a {\ncolor = "url(https://evil)"\n}\n}'));
});
test('arrow varieties and nested group properties', () => {
  const { svg, model } = render('diagram "x" {\nzone "one" {\ngroup "two" {\nserver a {\nip = "10.0.0.1"\n}\n}\n}\nnode b\na <-> b\na -- b\na --> b\n}');
  assert.ok(svg.includes('marker-start')); assert.ok(svg.includes('stroke-dasharray="5 4"')); assert.equal(model.byId.get('a').props.ip, '10.0.0.1');
});
test('source and element limits are enforced', () => {
  assert.throws(() => parse(' '.repeat(100001)));
  assert.throws(() => parse('diagram "x" {\n' + Array.from({ length: 251 }, (_, i) => 'node n' + i).join('\n') + '\n}'));
});
