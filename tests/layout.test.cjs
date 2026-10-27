const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const engine = require('../engine.js');
const { render } = require('../layout-elk.js');
const examples = require('../examples.js');
const soc = fs.readFileSync(require.resolve('./fixtures/soc.ret'), 'utf8');
const overlap = (a,b) => a.x < b.x+b.w-.1 && a.x+a.w > b.x+.1 && a.y < b.y+b.h-.1 && a.y+a.h > b.y+.1;
function verify(model) {
  const nodes = model.nodes.map(n => ({ id:n.id, x:n.ax, y:n.ay, w:n.w, h:n.h }));
  for (let i=0;i<nodes.length;i++) {
    const n=nodes[i]; assert.ok(n.x>=0 && n.y>=0 && n.x+n.w<=model.w+.1 && n.y+n.h<=model.h+.1);
    for(let j=i+1;j<nodes.length;j++) assert.ok(!overlap(n,nodes[j]), 'overlapping nodes '+n.id+' '+nodes[j].id);
  }
  const labels = [];
  for(const edge of model.edges) {
    assert.ok(edge.route);
    const points=[...edge.route.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(m=>({x:+m[1],y:+m[2]}));
    for(let i=1;i<points.length;i++) {
      const a=points[i-1],b=points[i]; assert.ok(a.x===b.x || a.y===b.y, 'non-orthogonal segment');
      for(const n of nodes) {
        if(n.id===edge.from || n.id===edge.to) continue;
        const hits=a.x===b.x ? a.x>n.x+.1 && a.x<n.x+n.w-.1 && Math.max(a.y,b.y)>n.y+.1 && Math.min(a.y,b.y)<n.y+n.h-.1 : a.y>n.y+.1 && a.y<n.y+n.h-.1 && Math.max(a.x,b.x)>n.x+.1 && Math.min(a.x,b.x)<n.x+n.w-.1;
        assert.ok(!hits, 'edge crosses unrelated node '+n.id);
      }
    }
    if(edge.labelBox) { for(const n of nodes) assert.ok(!overlap(edge.labelBox,n), 'label on node '+n.id); labels.push(edge.labelBox); }
  }
  for(let i=0;i<labels.length;i++) for(let j=i+1;j<labels.length;j++) assert.ok(!overlap(labels[i],labels[j]), 'overlapping labels');
}
test('SOC full layout preserves all 44 nodes and 48 edges without node/label overlaps or routes through unrelated nodes', async () => {
  const { model, svg } = await render(soc); assert.equal(model.nodes.length,44);assert.equal(model.edges.length,48);verify(model);assert.ok(!/NaN|Infinity/.test(svg));
});
test('SOC overview is compact and reversible, with explicit disclosure', async () => {
  const {model,notice}=await render(soc,'auto');verify(model);assert.equal(model.nodes.length,12);assert.ok(model.w*model.h < engine.render(soc).model.w*engine.render(soc).model.h*.4);assert.match(notice,/nascosti/);
  const full=await render(soc,'full');assert.equal(full.model.nodes.length,44);assert.equal(full.model.edges.length,48);
});
test('focus view preserves all internal activities and directed links', async()=>{
  const parsed=engine.parse(soc),th=parsed.children[0].children.find(g=>g.label==='Threat Hunting');
  const result=await render(soc,'group:'+th.line);assert.equal(result.model.nodes.length,5);assert.equal(result.model.edges.length,4);verify(result.model);assert.match(result.notice,/interni/);
});
test('nested-coordinate routes connect the actual network nodes',async()=>{
  const {model}=await render(examples.network);verify(model);
  for(const edge of model.edges) {
    const p=[...edge.route.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)];
    for(const [point,id] of [[p[0],edge.from],[p.at(-1),edge.to]]) {const n=model.byId.get(id),x=+point[1],y=+point[2];assert.ok(x>=n.ax-.1&&x<=n.ax+n.w+.1&&y>=n.ay-.1&&y<=n.ay+n.h+.1, 'incorrect group-relative endpoint');}
  }
});
test('layout commands are bounded enums; local directions and simple compatibility are supported',async()=>{
  for(const command of ['layout unknown','spacing 5','spacing "wide"'])assert.throws(()=>engine.parse('diagram "x" {\n'+command+'\n}'));
  const text='diagram "x" {\nlayout simple\nspacing wide\ngroup "A" {\ndirection down\nnode a\nnode b\na -> b\n}\n}';
  const r=await render(text);assert.equal(r.model.children[0].direction,'down');assert.ok(r.model.byId.get('a').ay<r.model.byId.get('b').ay);
});
test('layout retains escaped text, safe source bounds and prototype-like node IDs', async()=>{
  const r=await render('diagram "<script>" {\nnode constructor "<script>alert(1)</script>"\nnode __proto__\nconstructor -> __proto__ : "<image href=evil>"\n}');assert.ok(!r.svg.includes('<script>'));assert.ok(!r.svg.includes('<image'));await assert.rejects(render(' '.repeat(100001)));
});

test('real worker entry point initializes the bundled ELK without nested workers or DOM globals', { timeout: 3000 }, async () => {
  const vm = require('node:vm'), path = require('node:path');
  let respond, reject;
  const result = new Promise((resolve, fail) => { respond=resolve; reject=fail; });
  const context = vm.createContext({ console, setTimeout, clearTimeout, postMessage: respond });
  context.self = context;
  context.importScripts = (...urls) => {
    for (const url of urls) vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', url.split('?')[0]), 'utf8'), context, { filename: url });
  };
  vm.runInContext(fs.readFileSync(require.resolve('../render-worker.js'), 'utf8'), context);
  Promise.resolve(context.onmessage({ data: { source: examples.network, view: 'auto' } })).catch(reject);
  const output=await result;
  assert.equal(output.ok,true,output.error?.message);
  assert.equal(output.model.nodeCount,6);
  assert.ok(output.svg.startsWith('<svg'));
});

test('focused and long diagram titles fit the SVG header without covering nodes', async()=>{
  const parsed=engine.parse(soc),group=parsed.children[0].children.find(g=>g.label==='Threat Hunting');
  const focus=await render(soc,'group:'+group.line);
  assert.deepEqual(focus.model.headerLines,['Threat Hunting']);
  const long=await render('diagram "'+ 'Titolo molto lungo '.repeat(15).trim()+'" {\nnode a\n}');
  assert.ok(long.model.headerLines.length>1);
  const lastBaseline=29+(long.model.headerLines.length-1)*19;
  assert.ok(long.model.nodes[0].ay>lastBaseline+10);
  for(const line of long.model.headerLines) assert.ok(line.length*8<=long.model.w-70);
});
test('type labels can be hidden without losing names, details or navigation ranges', async()=>{
  const text='diagram "Navigazione" {\n group "Reparto" {\n server app "Applicazione" {\n note = "Test"\n }\n }\n}';
  const shown=await render(text,'full'),hidden=await render(text,'full',{showTypes:false});
  assert.match(shown.svg,/>SERVER<\/text>/);
  assert.doesNotMatch(hidden.svg,/>SERVER<\/text>/);
  assert.match(hidden.svg,/>Applicazione<\/text>/);
  assert.match(hidden.svg,/>Test<\/text>/);
  assert.deepEqual(engine.sourceTargets(hidden.model),engine.sourceTargets(shown.model));
  assert.deepEqual(engine.sourceTargets(hidden.model).map(t=>[t.label,t.line,t.endLine]),[['Reparto',2,6],['Applicazione',3,5]]);
  const overview=await render(text,'overview',{showTypes:false});
  assert.deepEqual(engine.sourceTargets(overview.model).map(t=>[t.label,t.line,t.endLine]),[['Reparto',2,6]]);
  assert.doesNotMatch(overview.svg,/>NODE<\/text>/);
  assert.match(overview.svg,/>1 elementi<\/text>/);
});
test('valid compound graph recovers from scanline hitbox failure without removing groups or connections', async()=>{
  const source=fs.readFileSync(require.resolve('./fixtures/compound-hitboxes.ret'),'utf8');
  const result=await render(source,'full');
  assert.equal(result.model.nodes.length,11);
  assert.equal(result.model.edges.length,9);
  assert.equal(result.model.children.filter(c=>c.type==='group').length,5);
  assert.match(result.notice,/compatibilità/);
  verify(result.model);
  const targets=engine.sourceTargets(result.model);
  assert.equal(targets.length,16);
  assert.equal(targets.find(t=>t.label==='Lotto 0').line,3);
});
