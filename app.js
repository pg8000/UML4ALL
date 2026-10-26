/* Browser interactions. Diagram source never leaves the browser. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const source = $('source'), preview = $('preview'), status = $('render-status'), message = $('message');
  const STORAGE_KEY = 'uml4all.source.v1';
  const MAX_SOURCE = UML4ALL.LIMITS.source;
  source.maxLength = MAX_SOURCE;
  let fitToWidth = true;
  let timer, result, zoom = 1, renderedSource = null, storageFailed = false;
  let worker = null, workerTimer, generation = 0, previewURL = null;
  function cancelRender() {
    generation++; clearTimeout(workerTimer);
    if (worker) { worker.terminate(); worker = null; }
  }
  function showMessage(text) { message.textContent = text; message.classList.toggle('visible', !!text); }
  function persist() {
    if (source.value.length > MAX_SOURCE) return;
    try { localStorage.setItem(STORAGE_KEY, source.value); storageFailed = false; }
    catch { storageFailed = true; }
  }
  function cursor() {
    const before = source.value.slice(0, source.selectionStart).split('\n');
    $('cursor').textContent = `Riga ${before.length}, colonna ${before.at(-1).length + 1}`;
  }
  function lines() {
    $('line-numbers').textContent = Array.from({ length: Math.min(UML4ALL.LIMITS.lines, source.value.split('\n').length) }, (_, i) => i + 1).join('\n');
    $('line-numbers').scrollTop = source.scrollTop; cursor();
  }
  function selectSource(target) {
    if (source.value !== renderedSource) {
      showMessage('Genera il diagramma aggiornato prima di individuare il codice.');
      return;
    }
    const rows = source.value.split('\n');
    const start = rows.slice(0, target.line - 1).reduce((sum, row) => sum + row.length + 1, 0);
    const end = rows.slice(0, target.endLine).reduce((sum, row) => sum + row.length + 1, 0) - 1;
    document.querySelector('.workspace').classList.remove('diagram-only');
    $('diagram-view').setAttribute('aria-pressed', 'false');
    $('diagram-view').textContent = 'Solo diagramma';
    source.focus({ preventScroll: true });
    source.setSelectionRange(start, Math.min(source.value.length, end));
    source.scrollTop = Math.max(0, (target.line - 3) * 23);
    source.scrollLeft = 0;
    source.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    $('line-numbers').scrollTop = source.scrollTop;
    cursor();
  }
  function scale() {
    if (!result) return;
    const stage = preview.querySelector('.diagram-stage');
    stage.style.width = result.model.w * zoom + 'px';
    stage.style.height = result.model.h * zoom + 'px';
    $('zoom-value').textContent = Math.round(zoom * 100) + '%';
  }
  function fit() {
    if (!result) return;
    fitToWidth = true;
    zoom = Math.min(1, Math.max(.08, (preview.clientWidth - 50) / result.model.w));
    scale(); preview.scrollTo(0, 0);
  }
  function generate() {
    clearTimeout(timer); cancelRender(); persist();
    const request = generation, snapshot = source.value;
    $('export-button').disabled = true;
    status.textContent = 'Elaborazione…';
    function failed(error) {
      if (request !== generation) return;
      clearTimeout(workerTimer);
      if (worker) { worker.terminate(); worker = null; }
      status.textContent = 'Da correggere';
      $('export-button').disabled = true;
      const prefix = result ? 'L’anteprima mostra l’ultima versione valida. ' : '';
      const line = Number.isInteger(error.line) && error.line > 0 ? 'Riga ' + error.line + ': ' : '';
      showMessage(prefix + line + String(error.message).slice(0, 500));
    }
    function completed(output) {
      if (request !== generation || snapshot !== source.value) return;
      clearTimeout(workerTimer);
      if (worker) { worker.terminate(); worker = null; }
      try {
        const safe = UML4ALLSafeSVG.validate(output.svg);
        if (![output.model.w, output.model.h].every(n => Number.isFinite(n) && n > 0 && n <= 1000000)) throw new Error('Dimensioni del diagramma non valide.');
        const image = document.createElement('img');
        image.alt = output.model.title;
        const url = URL.createObjectURL(new Blob([safe], { type: 'image/svg+xml' }));
        image.src = url;
        // SVG is displayed in image mode, never inserted as active page markup.
        const stage = document.createElement('div');
        stage.className = 'diagram-stage';
        stage.append(image);
        // Source navigation uses native HTML buttons; the SVG stays an inert image.
        for (const target of output.targets || []) {
          if (![target.x, target.y, target.w, target.h].every(Number.isFinite) ||
              target.x < 0 || target.y < 0 || target.w <= 0 || target.h <= 0 ||
              target.x + target.w > output.model.w + 1 || target.y + target.h > output.model.h + 1 ||
              !Number.isInteger(target.line) || !Number.isInteger(target.endLine) || target.line < 1 || target.endLine < target.line || target.endLine > UML4ALL.LIMITS.lines) continue;
          const button = document.createElement('button');
          button.type = 'button'; button.className = 'diagram-target';
          button.setAttribute('aria-label', 'Vai al codice: ' + String(target.label).slice(0, 300));
          button.title = 'Vai al codice · riga ' + target.line;
          button.style.left = target.x / output.model.w * 100 + '%';
          button.style.top = target.y / output.model.h * 100 + '%';
          button.style.width = target.w / output.model.w * 100 + '%';
          button.style.height = target.h / output.model.h * 100 + '%';
          button.addEventListener('click', () => selectSource(target));
          stage.append(button);
        }
        preview.replaceChildren(stage);
        if (previewURL) URL.revokeObjectURL(previewURL);
        previewURL = url;
        result = { svg: safe, model: output.model };
        renderedSource = snapshot;
      $('view-notice').textContent = output.notice || '';
      const selectedScope = $('diagram-scope').value;
      for (const option of Array.from($('diagram-scope').options)) if (option.value.startsWith('group:')) option.remove();
      for (const choice of output.choices || []) { const option = document.createElement('option'); option.value = choice.value; option.textContent = 'Gruppo: ' + choice.label; $('diagram-scope').append(option); }
      if (Array.from($('diagram-scope').options).some(o => o.value === selectedScope)) $('diagram-scope').value = selectedScope;
      $('diagram-info').textContent = `${result.model.nodeCount} elementi · ${result.model.edgeCount} collegamenti`;
      status.textContent = 'Aggiornato';
      $('export-button').disabled = false;
      showMessage(storageFailed ? 'Salvataggio automatico non disponibile. Usa “Salva codice” per conservare il lavoro.' : '');
      if (fitToWidth) fit();
      else scale();
      } catch (error) { failed(error); }
    }
    if (snapshot.length > MAX_SOURCE) { failed(new Error('Il codice supera il limite di 100.000 caratteri.')); return; }
    // Browsers disallow workers for file: URLs; bounded local rendering preserves offline use.
    if (location.protocol === 'file:') {
      try { const output = UML4ALL.render(snapshot, { showTypes: $('show-types').checked }); completed({ svg: output.svg, targets: UML4ALL.sourceTargets(output.model), model: { title: output.model.title, w: output.model.w, h: output.model.h, nodeCount: output.model.nodes.length, edgeCount: output.model.edges.length } }); }
      catch (error) { failed(error); }
      return;
    }
    try {
      worker = new Worker('render-worker.js?v=0.5.0');
      worker.onmessage = event => {
        if (event.data.ok) completed(event.data);
        else failed(event.data.error || new Error('Generazione non riuscita.'));
      };
      worker.onerror = () => failed(new Error('Motore di disegno non disponibile. Ricarica la pagina e riprova.'));
      workerTimer = setTimeout(() => failed(new Error('Elaborazione interrotta dopo 3 secondi. Riduci la complessità del diagramma.')), 3000);
      worker.postMessage({ source: snapshot, view: $('diagram-scope').value, showTypes: $('show-types').checked });
    } catch (error) { failed(new Error('Impossibile avviare il motore di disegno. Usa un browser aggiornato.')); }
  }
  function changed() {
    clearTimeout(timer); cancelRender(); lines(); persist();
    $('export-button').disabled = source.value !== renderedSource;
    status.textContent = 'Da generare';
    if ($('live').checked) timer = setTimeout(generate, 350);
    else showMessage(storageFailed ? 'Salvataggio automatico non disponibile. Usa “Salva codice”.' : 'Anteprima live sospesa. Premi Genera per aggiornare il diagramma.');
  }
  function load(text) {
    if (typeof text !== 'string' || text.length > MAX_SOURCE) { showMessage('Il codice supera il limite di 100.000 caratteri.'); return; }
    source.value = text; source.setSelectionRange(0, 0); source.scrollTop = 0; lines(); generate();
  }
  function download(content, type, extension) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement('a');
    a.href = url; a.download = ((result?.model.title || 'diagramma').replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 70) || 'diagramma') + extension;
    a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  source.addEventListener('input', changed);
  source.addEventListener('scroll', () => { $('line-numbers').scrollTop = source.scrollTop; });
  source.addEventListener('click', cursor); source.addEventListener('keyup', cursor);
  source.addEventListener('keydown', e => {
    if (e.key === 'Tab') { e.preventDefault(); const start = source.selectionStart; source.setRangeText('  ', start, source.selectionEnd, 'end'); changed(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); generate(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); $('save-button').click(); }
  });
  $('render-button').addEventListener('click', generate);
  $('live').addEventListener('change', () => { clearTimeout(timer); if ($('live').checked) generate(); });
  $('example').addEventListener('change', e => { $('diagram-scope').value = 'auto'; load(UML4ALLExamples[e.target.value]); });
  $('diagram-scope').addEventListener('change', () => { fitToWidth = true; generate(); });
  $('show-types').addEventListener('change', generate);
  $('save-button').addEventListener('click', () => download(source.value, 'text/plain;charset=utf-8', '.ret'));
  $('export-button').addEventListener('click', () => { if (result && renderedSource === source.value) download(result.svg, 'image/svg+xml;charset=utf-8', '.svg'); });
  $('zoom-in').addEventListener('click', () => { fitToWidth = false; zoom = Math.min(3, zoom * 1.2); scale(); });
  $('zoom-out').addEventListener('click', () => { fitToWidth = false; zoom = Math.max(.08, zoom / 1.2); scale(); });
  $('fit').addEventListener('click', fit);
  $('help-button').addEventListener('click', () => $('help').showModal());
  $('close-help').addEventListener('click', () => $('help').close());
  $('help').addEventListener('click', e => { if (e.target === $('help')) { const r = $('help').getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) $('help').close(); } });
  let saved; try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Local files can restrict storage. */ }
  load(saved !== null && saved !== undefined ? saved : UML4ALLExamples.network);
  $('diagram-view').addEventListener('click', () => {
    const expanded = document.querySelector('.workspace').classList.toggle('diagram-only');
    $('diagram-view').setAttribute('aria-pressed', String(expanded));
    $('diagram-view').textContent = expanded ? 'Mostra codice' : 'Solo diagramma';
  });
  const panels = $('diagram-panels'), resizer = $('panel-resizer');
  function resizeEditor(clientX) {
    const bounds = panels.getBoundingClientRect();
    const min = Math.max(220, bounds.width * .2);
    const max = Math.min(bounds.width * .7, bounds.width - 292);
    const width = Math.max(min, Math.min(max, clientX - bounds.left));
    panels.style.setProperty('--editor-width', width + 'px');
    resizer.setAttribute('aria-valuenow', String(Math.round(width / bounds.width * 100)));
    fitToWidth = true;
    fit();
  }
  resizer.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    resizer.setPointerCapture(event.pointerId);
    document.body.classList.add('resizing');
  });
  resizer.addEventListener('pointermove', event => {
    if (resizer.hasPointerCapture(event.pointerId)) resizeEditor(event.clientX);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    resizer.addEventListener(name, event => {
      document.body.classList.remove('resizing');
      if (resizer.hasPointerCapture(event.pointerId)) resizer.releasePointerCapture(event.pointerId);
    });
  }
  resizer.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const bounds = panels.getBoundingClientRect();
    let x = document.querySelector('.code-panel').getBoundingClientRect().right;
    if (event.key === 'Home') x = bounds.left;
    else if (event.key === 'End') x = bounds.right;
    else x += (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 60 : 20);
    resizeEditor(x);
  });
  for (const block of UML4ALLBlocks.catalog) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Aggiungi ' + block.label);
    const icon = document.createElement('span');
    icon.className = 'block-icon ' + block.kind;
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon, document.createTextNode(block.label));
    button.addEventListener('click', () => {
      try {
        const inserted = UML4ALLBlocks.insert(source.value, block.kind);
        source.value = inserted.source;
        source.focus({ preventScroll: true });
        source.setSelectionRange(inserted.start, inserted.end);
        lines();
        source.scrollTop = Math.max(0, (source.value.slice(0, inserted.start).split('\n').length - 4) * 23);
        fitToWidth = true;
        generate();
      } catch (error) { showMessage('Blocco non inserito. ' + error.message); }
    });
    $('block-list').append(button);
  }
  // Height now follows the image. Observe width only, and preserve manual zoom.
  let previewWidth = 0;
  new ResizeObserver(() => {
    const width = preview.clientWidth;
    if (width === previewWidth) return;
    previewWidth = width;
    if (fitToWidth) fit();
  }).observe(preview);
  window.addEventListener('pagehide', () => { cancelRender(); if (previewURL) URL.revokeObjectURL(previewURL); });
  window.addEventListener('pageshow', event => { if (event.persisted) generate(); });
})();
