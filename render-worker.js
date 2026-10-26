/* Layout and SVG construction stay inside a disposable worker with a 3s deadline. */
'use strict';
importScripts('engine.js?v=0.5.0', 'vendor/elk-0.12.0.js?v=uml4all-1', 'layout-elk.js?v=0.5.0');
self.onmessage = async event => {
  try {
    const request = typeof event.data === 'string' ? { source: event.data, view: 'auto' } : event.data;
    const { svg, model, choices, notice } = await UML4ALLLayout.render(request.source, request.view, { showTypes: request.showTypes !== false });
    self.postMessage({ ok: true, svg, choices, notice, targets: UML4ALL.sourceTargets(model), model: { title: model.title, w: model.w, h: model.h, nodeCount: model.nodes.length, edgeCount: model.edges.length } });
  } catch (error) {
    self.postMessage({ ok: false, error: { message: String(error.message).slice(0, 500), line: error.line } });
  }
};
