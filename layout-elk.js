/* ELK is vendored and runs inside the same disposable rendering worker. */
(function (root) {
  'use strict';
  const common = typeof module === 'object' && module.exports;
  const engine = common ? require('./engine.js') : root.UML4ALL;
  const ELK = common ? require('./vendor/elk-0.12.0.js') : root.ELK;
  const round = n => Math.round(n * 100) / 100;
  function project(original, view) {
    const groups = [];
    function visit(c) { for (const child of c.children || []) if (child.type === 'group') { groups.push(child); visit(child); } }
    visit(original);
    const choices = groups.map(g => ({ value: 'group:' + g.line, label: g.label }));
    const selected = view === 'auto' ? (original.nodes.length > 25 ? 'overview' : 'full') : view;
    if (selected === 'full') return { model: original, choices, notice: '' };
    const base = { ...original, children: [], nodes: [], edges: [], byId: new Map() };
    const mapping = new Map();
    function copy(item, parent, collapse) {
      if (collapse && item.type === 'group') {
        let count = 0, color;
        function collect(c) { for (const child of c.children) { if (child.type === 'group') collect(child); else { mapping.set(child.id, 'view:group:' + item.line); count++; color ||= child.props.color; } } }
        collect(item);
        const node = { type: 'element', kind: 'node', id: 'view:group:' + item.line, label: item.label, props: { note: count + ' elementi', ...(color ? { color } : {}) }, parent, line: item.line };
        parent.children.push(node); base.nodes.push(node); base.byId.set(node.id, node);
      } else if (item.type === 'group') {
        const group = { ...item, parent, children: [] };
        parent.children.push(group);
        for (const child of item.children) copy(child, group, selected === 'overview');
      } else {
        const node = { ...item, parent }; parent.children.push(node); base.nodes.push(node); base.byId.set(node.id, node); mapping.set(node.id, node.id);
      }
    }
    if (selected.startsWith('group:')) {
      const group = groups.find(g => 'group:' + g.line === selected);
      if (!group) return { model: original, choices, notice: 'Il gruppo selezionato non esiste più. Vista completa.' };
      base.title += ' / ' + group.label; base.displayTitle = group.label; base.direction = group.direction || original.direction;
      for (const child of group.children) copy(child, base, false);
    } else {
      for (const child of original.children) copy(child, base, child.type === 'group' && !child.children.some(c => c.type === 'group'));
    }
    const combined = new Map();
    for (const edge of original.edges) {
      const from = mapping.get(edge.from), to = mapping.get(edge.to);
      if (!from || !to || (from === to && selected === 'overview')) continue;
      const key = from + '|' + edge.arrow + '|' + to;
      if (selected !== 'overview') base.edges.push({ ...edge });
      else {
        if (!combined.has(key)) combined.set(key, { ...edge, from, to, texts: [], count: 0 });
        const merged = combined.get(key); merged.count++;
        if (edge.label && !merged.texts.includes(edge.label)) merged.texts.push(edge.label);
      }
    }
    for (const edge of combined.values()) { edge.label = edge.texts.join(' / '); if (edge.label.length > 160 || edge.texts.length > 2) edge.label = edge.count + ' collegamenti'; base.edges.push(edge); }
    const notice = selected === 'overview' ? 'Panoramica: ' + original.nodes.length + ' elementi riassunti per gruppo. Collegamenti interni nascosti e collegamenti esterni equivalenti accorpati. Scegli Dettaglio completo o un gruppo per leggere tutte le attività.' : 'Vista del gruppo: solo attività e collegamenti interni. Il codice completo resta invariato.';
    return { model: base, choices, notice };
  }
  async function render(source, view = 'full') {
    const projected = project(engine.parse(source), view);
    const model = engine.layout(projected.model);
    if (model.layout === 'simple') return { ...engine.renderModel(model), choices: projected.choices, notice: projected.notice };
    const gap = { compact: 24, normal: 40, wide: 64 }[model.spacing];
    const objects = new Map(), edges = new Map();
    let groupNumber = 0;
    function graph(container, id, inherited) {
      const direction = container.direction || inherited;
      objects.set(id, container);
      return {
        id,
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': direction === 'down' ? 'DOWN' : 'RIGHT',
          'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
          'elk.edgeRouting': 'ORTHOGONAL',
          'elk.spacing.nodeNode': String(gap),
          'elk.layered.spacing.nodeNodeBetweenLayers': String(gap + 32),
          'elk.spacing.edgeNode': '18',
          'elk.spacing.edgeEdge': '14',
          'elk.layered.spacing.edgeNodeBetweenLayers': '24',
          'elk.layered.spacing.edgeEdgeBetweenLayers': '18',
          'elk.padding': container === model ? '[top=54,left=30,bottom=30,right=30]' : '[top=48,left=24,bottom=24,right=24]',
          'elk.nodeSize.constraints': 'MINIMUM_SIZE',
          'elk.nodeSize.minimum': '(' + Math.max(100, (container.label || '').length * 7 + 42) + ',80)',
          'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
          'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
          'elk.separateConnectedComponents': 'true',
          'elk.aspectRatio': '1.6'
        },
        children: container.children.map(child => child.type === 'group' ? graph(child, 'g' + groupNumber++, direction) : (objects.set('n:' + child.id, child), { id: 'n:' + child.id, width: child.w, height: child.h }))
      };
    }
    const input = graph(model, 'root', model.direction);
    const title = model.displayTitle || model.title;
    const titleWidth = Math.max(250, Math.min(600, title.length * 8 + 70));
    const titleRows = engine.wrap(title, Math.max(12, Math.floor((titleWidth - 70) / 8))).length;
    input.layoutOptions['elk.nodeSize.minimum'] = '(' + titleWidth + ',80)';
    input.layoutOptions['elk.padding'] = '[top=' + Math.max(54, 25 + titleRows * 19) + ',left=30,bottom=30,right=30]';
    input.edges = model.edges.map((edge, i) => {
      const id = 'e' + i; edges.set(id, edge);
      const lines = engine.wrap(edge.label, 21);
      return { id, sources: ['n:' + edge.from], targets: ['n:' + edge.to], ...(edge.label ? {labels: [{text: edge.label, width: Math.max(...lines.map(s => s.length)) * 6 + 12, height: lines.length * 14 + 4}]} : {}) };
    });
    const elk = new ELK();
    const output = await elk.layout(input);
    const collected = [], positions = new Map();
    function apply(item, ox, oy) {
      const x = ox + (item.x || 0), y = oy + (item.y || 0), object = objects.get(item.id);
      positions.set(item.id, { x, y });
      if (object) { object.ax = round(x); object.ay = round(y); object.w = round(item.width); object.h = round(item.height); }
      for (const edge of item.edges || []) collected.push({edge, x, y});
      for (const child of item.children || []) apply(child, x, y);
    }
    apply(output, 0, 0);
    for (const entry of collected) {
      const edge = entry.edge;
      const { x, y } = positions.get(edge.container) || entry;
      const original = edges.get(edge.id);
      if (!original || !edge.sections?.length) throw new Error('Percorso del collegamento non disponibile.');
      original.route = edge.sections.map(section => [section.startPoint, ...(section.bendPoints || []), section.endPoint].map((p, i) => (i ? 'L' : 'M') + round(p.x + x) + ' ' + round(p.y + y)).join(' ')).join(' ');
      if (original.route.length > 1000) throw new Error('Percorso troppo complesso. Riduci i collegamenti.');
      if (original.label) {
        const label = edge.labels?.[0];
        if (!label || !Number.isFinite(label.x) || !Number.isFinite(label.y)) throw new Error('Etichetta del collegamento non posizionata.');
        original.labelX = round(x + label.x + label.width / 2);
        original.labelY = round(y + label.y + 11);
        original.labelBox = { x: round(x + label.x), y: round(y + label.y), w: label.width, h: label.height };
      }
    }
    if (collected.length !== model.edges.length || ![model.w, model.h].every(n => Number.isFinite(n) && n > 0 && n <= 1000000)) throw new Error('Layout non valido.');
    return { ...engine.renderModel(model), choices: projected.choices, notice: projected.notice };
  }
  const api = Object.freeze({ render });
  if (common) module.exports = api; else root.UML4ALLLayout = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
