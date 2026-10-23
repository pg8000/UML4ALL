const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { parse, render } = require('../engine.js');
const { validateAttribute } = require('../safe-svg.js');
const diagram = body => 'diagram "Test" {\n' + body + '\n}';

test('payloads in every text context remain escaped SVG text', () => {
  const payload = '</text><script>alert(1)</script><image href="https://attacker.invalid" onload="alert(1)"/>';
  const quote = JSON.stringify(payload);
  const source = `diagram ${quote} {\nzone ${quote} {\nnode a ${quote} {\nnote = ${quote}\n}\nnode b\n}\na -> b : ${quote}\n}`;
  const { svg } = render(source);
  assert.ok(!/<(?:script|image|foreignObject|iframe)\b/i.test(svg));
  assert.ok(svg.includes('&lt;script&gt;')); assert.ok(svg.includes('&quot;'));
});
test('raw scripts and prototype properties are rejected', () => {
  for (const body of ['<script>alert(1)</script>', 'eval("alert(1)")', 'node a {\n__proto__ = "x"\n}', 'node a {\nconstructor = "x"\n}']) assert.throws(() => parse(diagram(body)));
  const m = parse(diagram('node __proto__\nnode constructor\n__proto__ -> constructor'));
  assert.equal(Object.getPrototypeOf(m.nodes[0].props), null);
});
test('unsafe color expressions and SVG attributes are rejected', () => {
  for (const value of ['url(https://attacker.invalid)', 'url(#x)', 'red;filter:url(x)', '#fff" onload="x']) assert.throws(() => parse(diagram('node a {\ncolor = ' + JSON.stringify(value) + '\n}')));
  for (const [name, value] of [['onload','alert(1)'],['href','javascript:alert(1)'],['style','background:url(https://attacker.invalid)'],['fill','url(https://attacker.invalid)'],['marker-end','url(https://attacker.invalid)'],['xlink:href','#x'],['xmlns','http://www.w3.org/1999/xhtml'],['width','Infinity']]) assert.equal(validateAttribute(name,value),false);
  assert.equal(validateAttribute('marker-end','url(#arrow)'),true);
  assert.equal(validateAttribute('fill','#aabbcc'),true);
});
test('group flood is stopped before layout', () => {
  assert.throws(() => parse(diagram('group "x" {\n}\n'.repeat(101))), /100 gruppi/);
});
test('edge flood is stopped during parsing, including a chain', () => {
  assert.throws(() => parse(diagram('node a\n' + 'a -> a\n'.repeat(501))), /500 collegamenti/);
  assert.throws(() => parse(diagram('a' + ' -> a'.repeat(501))), /500 collegamenti/);
});
test('oversized text, identifiers, properties and control characters are rejected', () => {
  assert.throws(() => parse(diagram('node a ' + JSON.stringify('a'.repeat(301)))), /troppo lungo/);
  assert.throws(() => parse(diagram('node ' + 'a'.repeat(65))), /Identificatore troppo lungo/);
  assert.throws(() => parse(diagram('node a {\nnote = ' + JSON.stringify('a'.repeat(501)) + '\n}')), /troppo lungo/);
  assert.throws(() => parse(diagram('node a "\\u0000"')), /controllo/);
  assert.throws(() => parse(null), /deve essere testo/);
});
test('line count, line size and nesting are bounded', () => {
  assert.throws(() => parse(diagram('\n'.repeat(5000))), /5.000 righe/);
  assert.throws(() => parse(diagram('#' + 'x'.repeat(4096))), /Riga troppo lunga/);
  assert.throws(() => parse(diagram('zone "x" {\n'.repeat(13) + '}\n'.repeat(13))), /annidati/);
});
test('web entry point forbids uploads, active SVG insertion and permissive CSP', () => {
  const html = fs.readFileSync(require.resolve('../index.html'),'utf8');
  const app = fs.readFileSync(require.resolve('../app.js'),'utf8');
  assert.ok(html.includes('Content-Security-Policy')); assert.ok(html.includes("connect-src 'none'"));
  assert.ok(!/unsafe-inline|unsafe-eval/.test(html));
  assert.ok(!/type=["']file|file-input|import-button/.test(html + app));
  assert.ok(!/\.innerHTML\s*=|insertAdjacentHTML|\beval\s*\(/.test(app));
});
