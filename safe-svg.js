/* Fail-closed validation of generated SVG, shared by preview and export. */
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const tags = new Set(['svg', 'title', 'defs', 'marker', 'path', 'rect', 'text', 'g']);
  const numbers = new Set(['width', 'height', 'x', 'y', 'rx', 'refX', 'refY', 'markerWidth', 'markerHeight', 'stroke-width', 'font-size', 'letter-spacing']);
  const choices = {
    role: ['img'], 'aria-labelledby': ['diagram-title'], id: ['diagram-title', 'arrow'],
    orient: ['auto-start-reverse'], 'text-anchor': ['middle'], 'font-weight': ['600'],
    'font-family': ['Segoe UI,Arial,sans-serif'], 'marker-start': ['url(#arrow)'], 'marker-end': ['url(#arrow)']
  };
  function validateAttribute(name, value) {
    if (name === 'xmlns') return value === NS;
    if (Object.hasOwn(choices, name)) return choices[name].includes(value);
    if (numbers.has(name)) return ((name === 'width' || name === 'height') && value === '100%') || (/^-?\d+(?:\.\d+)?$/.test(value) && Math.abs(Number(value)) <= 1000000);
    if (name === 'fill' || name === 'stroke') return value === 'none' || /^#[a-f0-9]{6}$/i.test(value);
    if (name === 'd') return value.length <= 1000 && /^[MLCQZmlcqz0-9eE+.,\s-]+$/.test(value);
    if (name === 'viewBox') { const n = value.split(/\s+/); return n.length === 4 && n.every(v => /^\d+(?:\.\d+)?$/.test(v) && Number(v) <= 1000000); }
    if (name === 'stroke-dasharray') return /^\d+(?: \d+)*$/.test(value) && value.length <= 20;
    return false;
  }
  function validate(svg, Parser = root.DOMParser) {
    if (typeof svg !== 'string' || svg.length > 2000000 || /<!|<\?/i.test(svg)) throw new Error('SVG non consentito.');
    const doc = new Parser().parseFromString(svg, 'image/svg+xml');
    if (doc.doctype || doc.getElementsByTagName('parsererror').length || doc.documentElement.localName !== 'svg') throw new Error('SVG non valido.');
    const elements = doc.getElementsByTagName('*');
    if (elements.length > 20000) throw new Error('SVG troppo complesso.');
    for (const el of Array.from(elements)) {
      if (el.namespaceURI !== NS || !tags.has(el.localName) || el.attributes.length > 25) throw new Error('Elemento SVG non consentito.');
      for (const attr of Array.from(el.attributes)) {
        if ((attr.namespaceURI && attr.name !== 'xmlns') || !validateAttribute(attr.name, attr.value)) throw new Error('Attributo SVG non consentito.');
      }
    }
    return svg;
  }
  const api = Object.freeze({ validate, validateAttribute });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.UML4ALLSafeSVG = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
