/* Reusable diagram blocks. Validation and limits are shared with the engine. */
(function (root) {
  'use strict';
  const engine = typeof module === 'object' && module.exports ? require('./engine.js') : root.UML4ALL;
  const catalog = Object.freeze([
    ['server', 'Server'], ['database', 'Database'], ['cloud', 'Cloud'],
    ['firewall', 'Firewall'], ['router', 'Router'], ['switch', 'Switch'],
    ['service', 'Servizio'], ['actor', 'Utente'], ['task', 'Attività'],
    ['decision', 'Decisione'], ['start', 'Inizio'], ['end', 'Fine']
  ].map(([kind, label]) => Object.freeze({ kind, label })));
  function insert(source, kind) {
    const block = catalog.find(item => item.kind === kind);
    if (!block) throw new Error('Blocco non disponibile.');
    const text = source.trim() ? source : 'diagram "Il mio schema" {\n  direction right\n}\n';
    const model = engine.parse(text);
    let n = 1;
    while (model.byId.has(kind + n)) n++;
    const id = kind + n;
    let offset = 0, closing = -1;
    for (const line of text.split('\n')) {
      if (/^[\t ]*}[\t ]*(?:(?:\/\/|#)[^\r\n]*)?\r?$/.test(line)) closing = offset;
      offset += line.length + 1;
    }
    if (closing < 0) throw new Error('Chiudi il diagramma prima di aggiungere un blocco.');
    const declaration = '  ' + kind + ' ' + id + ' ' + JSON.stringify(block.label) + '\n';
    const updated = text.slice(0, closing) + declaration + text.slice(closing);
    engine.parse(updated); // Fail before changing the editor if a limit is exceeded.
    const start = closing + declaration.indexOf('"') + 1;
    return { source: updated, id, start, end: start + block.label.length };
  }
  const api = Object.freeze({ catalog, insert });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.UML4ALLBlocks = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
