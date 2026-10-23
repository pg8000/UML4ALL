/* Expensive parsing/layout stays off the page's UI thread. */
'use strict';
importScripts('engine.js?v=0.2.0');
self.onmessage = event => {
  try {
    const { svg, model } = UML4ALL.render(event.data);
    self.postMessage({ ok: true, svg, model: { title: model.title, w: model.w, h: model.h, nodeCount: model.nodes.length, edgeCount: model.edges.length } });
  } catch (error) {
    self.postMessage({ ok: false, error: { message: String(error.message).slice(0, 500), line: error.line } });
  }
};
