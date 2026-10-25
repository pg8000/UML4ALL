/* UML4ALL 0.1 — parser and SVG renderer. No network or runtime dependencies. */
(function (root) {
  'use strict';
  const TYPES = new Set('cloud router firewall switch network server database service actor task decision start end node'.split(' '));
  const PROPS = new Set('ip subnet vlan protocol owner note color'.split(' '));
  const LIMITS = Object.freeze({ source: 100000, lines: 5000, line: 4096, nodes: 250, edges: 500, groups: 100, label: 300, property: 500, identifier: 64, svg: 2000000 });
  const fail = (line, message) => { const e = new Error(message); e.line = line; throw e; };
  function checkedText(value, line, max = LIMITS.label) {
    if (value.length > max) fail(line, 'Testo troppo lungo (massimo ' + max + ' caratteri).');
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\ufffe\uffff]/u.test(value)) fail(line, 'Il testo contiene caratteri di controllo non consentiti.');
    return value;
  }
  function tokenize(line, number) {
    const tokens = []; let i = 0;
    while (i < line.length) {
      if (/\s/.test(line[i])) { i++; continue; }
      if (line[i] === '#' || line.slice(i, i + 2) === '//') break;
      if (line[i] === '"') {
        const start = i++;
        while (i < line.length && line[i] !== '"') { if (line[i] === '\\') i++; i++; }
        if (i >= line.length) fail(number, 'Etichetta senza virgolette di chiusura.');
        let value; try { value = JSON.parse(line.slice(start, ++i)); } catch { fail(number, 'Escape non valido: usa \\n, \\" o \\\\.'); }
        tokens.push({ value, quoted: true }); continue;
      }
      const match = /^(<->|-->|->|--|[{}:=]|[\p{L}_][\p{L}\p{N}_-]*)/u.exec(line.slice(i));
      if (!match) fail(number, 'Carattere inatteso: ' + line[i] + '. Usa virgolette per i valori.');
      tokens.push({ value: match[0], quoted: false }); i += match[0].length;
    }
    return tokens;
  }
  function parse(source) {
    if (typeof source !== 'string') fail(1, 'Il codice deve essere testo.');
    if (source.length > LIMITS.source) fail(1, 'Il codice supera il limite di 100.000 caratteri.');
    const model = { title: '', direction: 'right', layout: 'layered', spacing: 'compact', nodes: [], edges: [], children: [], line: 1 };
    const ids = new Map(), stack = []; let opened = false, closed = false, groups = 0;
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    if (lines.length > LIMITS.lines) fail(1, 'Limite: 5.000 righe.');
    lines.forEach((line, index) => {
      const n = index + 1;
      if (line.length > LIMITS.line) fail(n, 'Riga troppo lunga (massimo 4.096 caratteri).');
      const ts = tokenize(line, n), t = ts.map(x => x.value);
      if (!t.length) return;
      const is = (i, value) => ts[i] && !ts[i].quoted && t[i] === value;
      const id = i => ts[i] && !ts[i].quoted && /^[A-Za-z_][A-Za-z0-9_-]*$/.test(t[i]);
      if (!opened) {
        if (!(is(0, 'diagram') && ts[1]?.quoted && is(2, '{') && t.length === 3)) fail(n, 'Inizia con diagram "Titolo" {');
        model.title = checkedText(t[1], n); opened = true; stack.push(model); return;
      }
      if (closed) fail(n, 'Codice dopo la chiusura del diagramma.');
      const parent = stack[stack.length - 1];
      if (t.length === 1 && is(0, '}')) { stack.pop(); if (!stack.length) closed = true; return; }
      if (parent.type === 'element') {
        if (!(t.length === 3 && id(0) && is(1, '=') && (ts[2].quoted || id(2)))) fail(n, 'Proprietà attesa: nome = "valore"');
        if (!PROPS.has(t[0])) fail(n, 'Proprietà sconosciuta: ' + t[0]);
        if (Object.hasOwn(parent.props, t[0])) fail(n, 'Proprietà duplicata: ' + t[0]);
        if (t[0] === 'color' && !/^#[a-f0-9]{6}$/i.test(t[2])) fail(n, 'Il colore deve essere esadecimale, ad esempio "#dbeafe".');
        parent.props[t[0]] = checkedText(t[2], n, LIMITS.property); return;
      }
      if (is(0, 'direction')) {
        if (t.length !== 2 || !(is(1, 'right') || is(1, 'down'))) fail(n, 'Usa direction right oppure direction down nel diagramma o in un gruppo.');
        parent.direction = t[1]; return;
      }
      if (is(0, 'layout') || is(0, 'spacing')) {
        const allowed = is(0, 'layout') ? ['layered', 'simple'] : ['compact', 'normal', 'wide'];
        if (parent !== model || t.length !== 2 || ts[1].quoted || !allowed.includes(t[1])) fail(n, 'Usa ' + t[0] + ' ' + allowed.join(' oppure ') + ' nel diagramma.');
        model[t[0]] = t[1]; return;
      }
      if (is(0, 'zone') || is(0, 'group')) {
        if (!(t.length === 3 && ts[1].quoted && is(2, '{'))) fail(n, 'Gruppo atteso: zone "Nome" {');
        if (stack.length > 12) fail(n, 'Troppi gruppi annidati (massimo 12 livelli).');
        if (++groups > LIMITS.groups) fail(n, 'Limite: 100 gruppi.');
        const group = { type: 'group', label: checkedText(t[1], n), children: [], parent, line: n };
        parent.children.push(group); stack.push(group); return;
      }
      if (id(0) && ts[1] && !ts[1].quoted && ['->', '<->', '--', '-->'].includes(t[1])) {
        let p = 1; const added = [];
        while (p < t.length && !is(p, ':')) {
          if (!['->', '<->', '--', '-->'].includes(t[p]) || ts[p].quoted || !id(p + 1)) fail(n, 'Collegamento atteso: a -> b : etichetta');
          if (model.edges.length + added.length >= LIMITS.edges) fail(n, 'Limite: 500 collegamenti.');
          if (t[p - 1].length > LIMITS.identifier || t[p + 1].length > LIMITS.identifier) fail(n, 'Identificatore troppo lungo (massimo 64 caratteri).');
          added.push({ from: t[p - 1], to: t[p + 1], arrow: t[p], line: n, label: '' }); p += 2;
        }
        if (p < t.length) {
          if (p + 1 === t.length) fail(n, 'Manca l’etichetta dopo i due punti.');
          const label = checkedText(t.slice(p + 1).join(' '), n); added.forEach(e => { e.label = label; });
        }
        model.edges.push(...added); return;
      }
      if (id(0) && TYPES.has(t[0])) {
        if (!id(1)) fail(n, 'Manca un identificatore valido per l’elemento.');
        if (t[1].length > LIMITS.identifier) fail(n, 'Identificatore troppo lungo (massimo 64 caratteri).');
        if (model.nodes.length >= LIMITS.nodes) fail(n, 'Limite: 250 elementi.');
        let p = 2, label = t[1];
        if (ts[p]?.quoted) label = t[p++];
        let block = false; if (is(p, '{')) { block = true; p++; }
        if (p !== t.length) fail(n, 'Elemento atteso: ' + t[0] + ' id "Etichetta"');
        if (ids.has(t[1])) fail(n, 'Identificatore duplicato: ' + t[1]);
        const node = { type: 'element', kind: t[0], id: t[1], label: checkedText(label, n), props: Object.create(null), parent, line: n };
        ids.set(node.id, node); model.nodes.push(node); parent.children.push(node); if (block) stack.push(node); return;
      }
      fail(n, 'Istruzione non riconosciuta: ' + t[0]);
    });
    if (!opened) fail(1, 'Scrivi diagram "Titolo" { per iniziare.');
    if (!closed) fail(stack.at(-1)?.line || lines.length, 'Manca una parentesi graffa di chiusura }.');
    if (model.nodes.length > 250 || model.edges.length > 500) fail(1, 'Limite: 250 elementi e 500 collegamenti.');
    for (const edge of model.edges) for (const key of ['from', 'to']) if (!ids.has(edge[key])) fail(edge.line, 'Elemento non dichiarato: ' + edge[key]);
    model.byId = ids; return model;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function wrap(s, limit = 28) {
    return String(s).split('\n').flatMap(line => {
      const out = []; if (!line) return [''];
      while (line.length > limit) { let k = line.lastIndexOf(' ', limit); if (k < limit / 2) k = limit; out.push(line.slice(0, k)); line = line.slice(k).trimStart(); }
      out.push(line); return out;
    });
  }
  function layout(model) {
    function arrange(container) {
      const horizontal = (container.direction || model.direction) === 'right';
      const children = container.children;
      for (const c of children) {
        if (c.type === 'group') arrange(c);
        else {
          c.labelLines = wrap(c.label);
          c.detailLines = Object.entries(c.props).filter(([k]) => k !== 'color').flatMap(([k, v]) => wrap((k === 'note' ? '' : k + ': ') + v, 32));
          c.w = c.kind === 'decision' ? 220 : 190;
          c.h = Math.max(c.kind === 'decision' ? 125 : 83, 40 + c.labelLines.length * 17 + c.detailLines.length * 15 + (c.detailLines.length ? 12 : 0));
          if (c.kind === 'decision') c.h += c.detailLines.length ? 30 : 0;
        }
      }
      const belongs = node => { let c = node; while (c && c.parent !== container) c = c.parent; return c; };
      const adj = new Map(children.map(c => [c, new Set()]));
      for (const e of model.edges) { const a = belongs(model.byId.get(e.from)), b = belongs(model.byId.get(e.to)); if (a && b && a !== b) adj.get(a).add(b); }
      // Collapse strongly connected components so cycles cannot inflate ranks.
      let next = 0; const visited = new Map(), low = new Map(), active = new Set(), pending = [], components = [];
      function visit(c) {
        visited.set(c, next); low.set(c, next++); active.add(c); pending.push(c);
        for (const d of adj.get(c)) { if (!visited.has(d)) { visit(d); low.set(c, Math.min(low.get(c), low.get(d))); } else if (active.has(d)) low.set(c, Math.min(low.get(c), visited.get(d))); }
        if (low.get(c) === visited.get(c)) { const component = []; let d; do { d = pending.pop(); active.delete(d); component.push(d); } while (d !== c); components.push(component); }
      }
      children.forEach(c => { if (!visited.has(c)) visit(c); });
      const compOf = new Map(); components.forEach((cs, i) => cs.forEach(c => compOf.set(c, i)));
      const ranks = new Map();
      function rank(i) { if (ranks.has(i)) return ranks.get(i); let r = 0; components.forEach((cs, j) => { if (i !== j && cs.some(c => [...adj.get(c)].some(d => compOf.get(d) === i))) r = Math.max(r, rank(j) + 1); }); ranks.set(i, r); return r; }
      components.forEach((_, i) => rank(i));
      const levels = []; children.forEach(c => { const r = ranks.get(compOf.get(c)); (levels[r] ||= []).push(c); });
      const padding = container === model ? 35 : 26, head = container === model ? 54 : 42;
      let along = padding, maxCross = 0;
      const metrics = levels.map(items => ({ items, along: Math.max(...items.map(c => horizontal ? c.w : c.h)), cross: items.reduce((sum, c) => sum + (horizontal ? c.h : c.w), 0) + (items.length - 1) * 36 }));
      const crossSize = Math.max(0, ...metrics.map(m => m.cross));
      for (const m of metrics) {
        let cross = (crossSize - m.cross) / 2;
        for (const c of m.items) { c.x = horizontal ? along + (m.along - c.w) / 2 : padding + cross; c.y = horizontal ? head + cross : head + along - padding + (m.along - c.h) / 2; cross += (horizontal ? c.h : c.w) + 36; }
        along += m.along + 100; maxCross = Math.max(maxCross, m.cross);
      }
      container.w = Math.max(250, horizontal ? along - (metrics.length ? 100 : 0) + padding : maxCross + padding * 2, wrap(container.label || model.title).join('').length * 7 + 50);
      container.h = Math.max(120, horizontal ? head + maxCross + padding : head + along - (metrics.length ? 100 : 0));
    }
    arrange(model);
    function absolute(c, ox, oy) { c.ax = ox + (c.x || 0); c.ay = oy + (c.y || 0); if (c.children) c.children.forEach(n => absolute(n, c.ax, c.ay)); }
    absolute(model, 0, 0); return model;
  }
  function render(source) { return renderModel(layout(parse(source))); }
  function renderModel(model) {
    const parts = []; let outputSize = 0;
    const add = s => { outputSize += s.length; if (outputSize > LIMITS.svg) fail(1, 'Il diagramma generato supera il limite di 2 MB.'); parts.push(s); };
    add(`<svg xmlns="http://www.w3.org/2000/svg" width="${model.w}" height="${model.h}" viewBox="0 0 ${model.w} ${model.h}" role="img" aria-labelledby="diagram-title"><title id="diagram-title">${esc(model.title)}</title><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="#6b8879" stroke-width="1.6"/></marker></defs><rect width="100%" height="100%" fill="#fcfdfb" rx="10"/>`);
    model.headerLines = wrap(model.displayTitle || model.title, Math.max(12, Math.floor((model.w - 70) / 8)));
    model.headerLines.forEach((line, i) => add(`<text x="35" y="${29 + i * 19}" font-family="Segoe UI,Arial,sans-serif" font-size="15" font-weight="600" fill="#284a3c">${esc(line)}</text>`));
    function groups(c, depth) { for (const g of c.children || []) if (g.type === 'group') { add(`<rect x="${g.ax}" y="${g.ay}" width="${g.w}" height="${g.h}" rx="12" fill="${depth % 2 ? '#f8faf5' : '#eff4eb'}" stroke="#c9d7c2" stroke-dasharray="5 4"/><text x="${g.ax + 17}" y="${g.ay + 25}" font-family="Segoe UI,Arial,sans-serif" font-size="12" font-weight="600" fill="#66805a">${esc(g.label)}</text>`); groups(g, depth + 1); } }
    groups(model, 0);
    const labels = [];
    for (const e of model.edges) {
      const a = model.byId.get(e.from), b = model.byId.get(e.to), horizontal = model.direction === 'right';
      let x1 = a.ax + a.w / 2, y1 = a.ay + a.h / 2, x2 = b.ax + b.w / 2, y2 = b.ay + b.h / 2, path, lx, ly;
      if (e.route) {
        path = e.route; lx = e.labelX; ly = e.labelY;
      } else if (a === b) {
        x1 = a.ax + a.w; y1 = a.ay + a.h * .35; x2 = x1; y2 = a.ay + a.h * .7;
        path = `M${x1} ${y1} C${x1 + 40} ${y1 - 35} ${x2 + 40} ${y2 + 35} ${x2} ${y2}`; lx = x1 + 23; ly = a.ay + a.h / 2;
      } else if (horizontal && Math.abs(x2 - x1) > 10) {
        const dir = x2 > x1 ? 1 : -1; x1 += dir * a.w / 2; x2 -= dir * b.w / 2; const mid = (x1 + x2) / 2;
        path = `M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`; lx = mid; ly = (y1 + y2) / 2 - 9;
      } else {
        const dir = y2 >= y1 ? 1 : -1; y1 += dir * a.h / 2; y2 -= dir * b.h / 2; const mid = (y1 + y2) / 2;
        path = `M${x1} ${y1} C${x1} ${mid} ${x2} ${mid} ${x2} ${y2}`; lx = (x1 + x2) / 2 + 12; ly = mid;
      }
      add(`<path d="${path}" fill="none" stroke="#7a9585" stroke-width="1.5" ${e.arrow === '-->' ? 'stroke-dasharray="5 4"' : ''} ${e.arrow !== '--' ? 'marker-end="url(#arrow)"' : ''} ${e.arrow === '<->' ? 'marker-start="url(#arrow)"' : ''}/>`);
      if (e.label) { const lines = wrap(e.label, 21), width = Math.max(...lines.map(l => l.length)) * 6 + 12; labels.push(`<g><rect x="${lx - width / 2}" y="${ly - 11}" width="${width}" height="${lines.length * 14 + 4}" fill="#fcfdfb" rx="3"/>${lines.map((line, i) => `<text x="${lx}" y="${ly + i * 14}" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="10" fill="#69816c">${esc(line)}</text>`).join('')}</g>`); }
    }
    for (const n of model.nodes) {
      const palette = ['firewall', 'decision'].includes(n.kind) ? ['#fbf2e4', '#c8a77b', '#8c693d'] : ['cloud', 'actor'].includes(n.kind) ? ['#edf2f8', '#a7bacd', '#5e7a94'] : ['start', 'end'].includes(n.kind) ? ['#e3eddf', '#94b187', '#537a47'] : ['#fffefb', '#b1c4ac', '#55774c'];
      const [fill, stroke, ink] = palette, x = n.ax, y = n.ay, w = n.w, h = n.h;
      add(`<g><title>${esc(n.kind + ' ' + n.id)}</title>`);
      if (n.kind === 'decision') add(`<path d="M${x + w / 2} ${y} L${x + w} ${y + h / 2} L${x + w / 2} ${y + h} L${x} ${y + h / 2} Z" fill="${n.props.color || fill}" stroke="${stroke}"/>`);
      else add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${['start', 'end', 'cloud'].includes(n.kind) ? 30 : 8}" fill="${n.props.color || fill}" stroke="${stroke}" stroke-width="${n.kind === 'end' ? 2.5 : 1.2}"/>`);
      if (n.kind === 'database') add(`<path d="M${x} ${y + 14} Q${x + w / 2} ${y + 29} ${x + w} ${y + 14}" fill="none" stroke="${stroke}"/>`);
      const base = n.kind === 'decision' ? y + h / 2 - (n.labelLines.length * 17 + n.detailLines.length * 15) / 2 + 8 : y + 38;
      if (n.kind !== 'decision') add(`<text x="${x + w / 2}" y="${y + 18}" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="8" letter-spacing="1.2" fill="${ink}">${esc(n.kind.toUpperCase())}</text>`);
      n.labelLines.forEach((line, i) => add(`<text x="${x + w / 2}" y="${base + i * 17}" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="12" font-weight="600" fill="#294536">${esc(line)}</text>`));
      n.detailLines.forEach((line, i) => add(`<text x="${x + w / 2}" y="${base + n.labelLines.length * 17 + 6 + i * 15}" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="10" fill="#74846e">${esc(line)}</text>`));
      add('</g>');
    }
    labels.forEach(add); add('</svg>');
    return { svg: parts.join(''), model };
  }
  const api = Object.freeze({ parse, layout, render, renderModel, wrap, LIMITS });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.UML4ALL = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
