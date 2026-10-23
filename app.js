/* Browser interactions. Diagram source never leaves the browser. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const source = $('source'), preview = $('preview'), status = $('render-status'), message = $('message');
  const STORAGE_KEY = 'uml4all.source.v1';
  const MAX_SOURCE = UML4ALL.LIMITS.source;
  source.maxLength = MAX_SOURCE;
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
  function scale() {
    if (!result) return;
    const svg = preview.querySelector('img');
    svg.style.width = result.model.w * zoom + 'px';
    svg.style.height = result.model.h * zoom + 'px';
    $('zoom-value').textContent = Math.round(zoom * 100) + '%';
  }
  function fit() {
    if (!result) return;
    zoom = Math.min(1, Math.max(.08, Math.min((preview.clientWidth - 50) / result.model.w, (preview.clientHeight - 50) / result.model.h)));
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
        preview.replaceChildren(image);
        if (previewURL) URL.revokeObjectURL(previewURL);
        previewURL = url;
        result = { svg: safe, model: output.model };
        renderedSource = snapshot;
      $('diagram-info').textContent = `${result.model.nodeCount} elementi · ${result.model.edgeCount} collegamenti`;
      status.textContent = 'Aggiornato';
      $('export-button').disabled = false;
      showMessage(storageFailed ? 'Salvataggio automatico non disponibile. Usa “Salva codice” per conservare il lavoro.' : '');
      fit();
      } catch (error) { failed(error); }
    }
    if (snapshot.length > MAX_SOURCE) { failed(new Error('Il codice supera il limite di 100.000 caratteri.')); return; }
    // Browsers disallow workers for file: URLs; bounded local rendering preserves offline use.
    if (location.protocol === 'file:') {
      try { const output = UML4ALL.render(snapshot); completed({ svg: output.svg, model: { title: output.model.title, w: output.model.w, h: output.model.h, nodeCount: output.model.nodes.length, edgeCount: output.model.edges.length } }); }
      catch (error) { failed(error); }
      return;
    }
    try {
      worker = new Worker('render-worker.js?v=0.2.0');
      worker.onmessage = event => {
        if (event.data.ok) completed(event.data);
        else failed(event.data.error || new Error('Generazione non riuscita.'));
      };
      worker.onerror = () => failed(new Error('Motore di disegno non disponibile. Ricarica la pagina e riprova.'));
      workerTimer = setTimeout(() => failed(new Error('Elaborazione interrotta dopo 3 secondi. Riduci la complessità del diagramma.')), 3000);
      worker.postMessage(snapshot);
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
  $('example').addEventListener('change', e => load(UML4ALLExamples[e.target.value]));
  $('save-button').addEventListener('click', () => download(source.value, 'text/plain;charset=utf-8', '.ret'));
  $('export-button').addEventListener('click', () => { if (result && renderedSource === source.value) download(result.svg, 'image/svg+xml;charset=utf-8', '.svg'); });
  $('zoom-in').addEventListener('click', () => { zoom = Math.min(3, zoom * 1.2); scale(); });
  $('zoom-out').addEventListener('click', () => { zoom = Math.max(.08, zoom / 1.2); scale(); });
  $('fit').addEventListener('click', fit);
  $('help-button').addEventListener('click', () => $('help').showModal());
  $('close-help').addEventListener('click', () => $('help').close());
  $('help').addEventListener('click', e => { if (e.target === $('help')) { const r = $('help').getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) $('help').close(); } });
  let saved; try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Local files can restrict storage. */ }
  load(saved !== null && saved !== undefined ? saved : UML4ALLExamples.network);
  new ResizeObserver(() => fit()).observe(preview);
  window.addEventListener('pagehide', () => { cancelRender(); if (previewURL) URL.revokeObjectURL(previewURL); });
  window.addEventListener('pageshow', event => { if (event.persisted) generate(); });
})();
