/* Medidor de rendimiento (?perf). Sólo se carga con el flag: sin él, scene.js no importa este archivo y nada cambia.
   Mide la cadencia real de la página (rAF propio, no el loop de la escena), el costo de CPU del frame de la escena
   (envoltura de setAnimationLoop), renderer.info (draw calls, triángulos, memoria de GPU que three lleva en cuenta),
   memoria JS (performance.memory, Chrome) y el main thread (long tasks y long animation frames con su script).
   Overlay arriba a la izquierda, sin eventos de puntero. API en window.__perf:
     start()            empieza a registrar por sección (hero, about, projects, video, stack, experience, contact)
     stop()             deja de registrar y devuelve el resumen por sección + tirones (frames > 50 ms) + scripts de LoAF
     tour(vhPerSec)     recorre la página entera scrolleando a velocidad constante (por defecto 1 viewport/s) mientras
                        registra; resuelve con el resumen. Es scroll nativo de la página (scrollBy por frame).
     hold(sec)          registra sec segundos sin moverse y devuelve el resumen (fps en reposo de la sección actual)
     snapshot()         los números del overlay en este instante */

const ZONES = [
  ['hero', '.transition-zone[data-section="hero"]'],
  ['about', '.transition-zone[data-section="about"]'],
  ['projects', '.transition-zone[data-section="projects"]'],
  ['video', '.fbf-zone'],
  ['stack', '.stack-zone'],
  ['experience', '.transition-zone[data-section="experience"]'],
  ['contact', '.transition-zone[data-section="contact"]'],
];
const MB = (b) => +(b / 1048576).toFixed(1);
const pct = (sorted, q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] : 0);

export function attachPerfMeter({ renderer, ctl, backend, gpu }) {
  const info = renderer.info;
  // CPU del frame de la escena: se envuelve el callback que scene.js pasa a setAnimationLoop
  let sceneMs = 0, sceneFrames = 0;
  const setLoop = renderer.setAnimationLoop.bind(renderer);
  renderer.setAnimationLoop = (cb) => setLoop(cb ? (t, f) => { const t0 = performance.now(); cb(t, f); sceneMs = performance.now() - t0; sceneFrames++; } : null);

  // overlay
  const box = document.createElement('div');
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = 'position:fixed;left:8px;top:8px;z-index:2147483647;pointer-events:none;font:11px/1.35 ui-monospace,Consolas,monospace;color:#e8e4de;background:rgba(0,0,0,.72);padding:6px 8px;white-space:pre;border:1px solid rgba(232,39,42,.5)';
  document.body.appendChild(box);

  // zonas: top de documento de cada sección (se recalcula en resize y cada 2 s: el layout de la galería cambia al hidratar)
  let tops = [];
  const measureZones = () => {
    tops = ZONES.map(([name, sel]) => { const el = document.querySelector(sel); return el ? [name, el.getBoundingClientRect().top + scrollY] : null; }).filter(Boolean);
  };
  measureZones();
  const zoneTimer = setInterval(measureZones, 2000);
  addEventListener('resize', measureZones);
  const sectionAt = () => {
    const y = scrollY + innerHeight * 0.5;
    let cur = tops.length ? tops[0][0] : '?';
    for (const [name, top] of tops) if (top <= y) cur = name;
    return cur;
  };

  // main thread: long tasks y long animation frames (LoAF, Chrome ≥ 123), con el script que más pesó
  const lt = []; const loaf = [];
  const obs = [];
  try { const o = new PerformanceObserver((l) => { for (const e of l.getEntries()) lt.push({ t: e.startTime, d: e.duration }); }); o.observe({ type: 'longtask', buffered: false }); obs.push(o); } catch (e) { /* sin soporte */ }
  try {
    const o = new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        const scripts = (e.scripts || []).map((s) => ({ src: (s.sourceURL || '').replace(/^.*\/_next\/static\/chunks\//, '').replace(/[?#].*$/, ''), fn: s.sourceFunctionName || '', inv: s.invoker || '', d: s.duration }));
        loaf.push({ t: e.startTime, d: e.duration, block: e.blockingDuration || 0, scripts });
      }
    });
    o.observe({ type: 'long-animation-frame', buffered: false }); obs.push(o);
  } catch (e) { /* sin soporte */ }

  // GPU de primer uso (WebGPU): pipelines creados en forma síncrona (compilación en pleno frame), módulos de shader,
  // texturas nuevas y subidas de imágenes/video (copyExternalImageToTexture), con su u y su costo de CPU. Sirve para
  // atribuir cada tirón a lo que pasó en ese frame (el resumen los trae en `gpu`).
  const gev = [];
  const dev = renderer.backend && renderer.backend.device;
  const uNow = () => (ctl.info && ctl.info.gal ? +ctl.info.gal().toFixed(2) : null);
  const wrapDev = (obj, name, kind, sizeOf) => {
    if (!obj || typeof obj[name] !== 'function') return;
    const orig = obj[name].bind(obj);
    obj[name] = (...a) => {
      const t0 = performance.now();
      const r = orig(...a);
      gev.push({ t: t0, ms: performance.now() - t0, kind, u: uNow(), sec: sectionAt(), px: sizeOf ? sizeOf(...a) : 0 });
      if (gev.length > 4000) gev.splice(0, 1000);
      return r;
    };
  };
  const dim = (e) => (e ? (e.width != null ? e.width * (e.height || 1) : (e[0] || 0) * (e[1] || 1)) : 0);
  if (dev) {
    wrapDev(dev, 'createRenderPipeline', 'pipeSync');
    wrapDev(dev, 'createRenderPipelineAsync', 'pipeAsync');
    wrapDev(dev, 'createShaderModule', 'shader');
    wrapDev(dev, 'createTexture', 'texNew', (d) => dim(d && d.size));
    wrapDev(dev.queue, 'copyExternalImageToTexture', 'upload', (s, d, e) => dim(e));
  }

  // registro
  let rec = null;
  const newRec = () => ({ t0: performance.now(), by: {}, hitches: [] });
  const bucket = (name) => (rec.by[name] || (rec.by[name] = { dt: [], scene: [], calls: [], tris: [], heap: [], gpuB: [], tex: [], geo: [], scrollPx: 0, runOn: 0, n: 0 }));

  const win = [];   // últimos 120 frames para el overlay
  let last = performance.now(), lastY = scrollY, raf = 0, alive = true, paint = 0;
  function tick(now) {
    if (!alive) return;
    const dt = now - last; last = now;
    const sec = sectionAt();
    const mem = info.memory, r = info.render;
    const heap = performance.memory ? performance.memory.usedJSHeapSize : 0;
    const gpuB = (mem.texturesSize || 0) + (mem.attributesSize || 0) + (mem.indexAttributesSize || 0) + (mem.uniformBuffersSize || 0) + (mem.storageAttributesSize || 0);
    const running = ctl.info && ctl.info.running ? ctl.info.running() : false;
    if (dt < 1000) { win.push(dt); if (win.length > 120) win.shift(); }
    if (rec && dt < 1000 && !document.hidden) {
      const b = bucket(sec);
      b.dt.push(dt); b.n++;
      b.scene.push(running ? sceneMs : 0);
      b.calls.push(running ? r.drawCalls : 0); b.tris.push(running ? r.triangles : 0);
      b.heap.push(heap); b.gpuB.push(gpuB); b.tex.push(mem.textures); b.geo.push(mem.geometries);
      b.scrollPx += Math.abs(scrollY - lastY); if (running) b.runOn++;
      if (dt > 50) {
        // lo que la GPU hizo por primera vez en ese frame (y el anterior): pipelines síncronos, shaders, texturas, subidas
        const ev = gev.filter((e) => e.t >= now - dt - 20 && e.t <= now);
        const k = (kind) => ev.filter((e) => e.kind === kind);
        rec.hitches.push({ t: Math.round(now - rec.t0), dt: Math.round(dt), sec, y: Math.round(scrollY), u: ctl.info && ctl.info.gal ? +ctl.info.gal().toFixed(2) : null,
          pipeSync: k('pipeSync').length, pipeSyncMs: Math.round(k('pipeSync').reduce((a, e) => a + e.ms, 0)), shader: k('shader').length,
          texNew: k('texNew').length, upload: k('upload').length, uploadMPx: +(k('upload').reduce((a, e) => a + e.px, 0) / 1e6).toFixed(2) });
      }
    }
    lastY = scrollY;
    if (++paint % 8 === 0) {
      const s = win.slice().sort((a, b) => a - b);
      const p50 = pct(s, 0.5), p95 = pct(s, 0.95);
      box.textContent = `${backend} · ${gpu}\n` +
        `fps p50 ${p50 ? (1000 / p50).toFixed(0) : '-'}  p5 ${p95 ? (1000 / p95).toFixed(0) : '-'}  frame ${p50.toFixed(1)} ms (p95 ${p95.toFixed(1)})\n` +
        `scene cpu ${running ? sceneMs.toFixed(2) + ' ms' : 'en pausa'}  dpr ${renderer.getPixelRatio().toFixed(2)}  ${innerWidth}×${innerHeight}\n` +
        `draw ${r.drawCalls}  tris ${(r.triangles / 1000).toFixed(0)}k  tex ${mem.textures}  geo ${mem.geometries}  prog ${mem.programs}\n` +
        `gpu≈ ${MB(gpuB)} MB  js ${heap ? MB(heap) + ' MB' : 'n/d'}  sec ${sec}${rec ? '  ● rec' : ''}`;
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  function summarize() {
    if (!rec) return null;
    const t1 = performance.now();
    const out = { backend, gpu, vw: innerWidth, vh: innerHeight, dpr: renderer.getPixelRatio(), devicePixelRatio, ms: Math.round(t1 - rec.t0), sections: {}, hitches: rec.hitches };
    const avg = (xs) => (xs.length ? xs.reduce((a, c) => a + c, 0) / xs.length : 0);
    const mx = (xs) => xs.reduce((a, c) => Math.max(a, c), 0);
    for (const [name] of ZONES) {
      const b = rec.by[name]; if (!b) continue;
      const dt = b.dt.slice().sort((a, c) => a - c);
      const sc = b.scene.filter((x) => x > 0).sort((a, c) => a - c);
      out.sections[name] = {
        frames: b.n, scrollVh: +(b.scrollPx / innerHeight).toFixed(1), sceneOnPct: Math.round((100 * b.runOn) / b.n),
        fpsP50: +(1000 / pct(dt, 0.5)).toFixed(1), fpsP5: +(1000 / pct(dt, 0.95)).toFixed(1), fpsAvg: +(1000 / avg(dt)).toFixed(1),
        frameP50: +pct(dt, 0.5).toFixed(1), frameP95: +pct(dt, 0.95).toFixed(1), frameMax: Math.round(dt[dt.length - 1]),
        over33: b.dt.filter((x) => x > 33.4).length, over50: b.dt.filter((x) => x > 50).length,
        sceneCpuP50: +pct(sc, 0.5).toFixed(2), sceneCpuP95: +pct(sc, 0.95).toFixed(2),
        drawAvg: Math.round(avg(b.calls.filter((x) => x > 0))), drawMax: mx(b.calls), trisMaxK: Math.round(mx(b.tris) / 1000),
        texMax: mx(b.tex), geoMax: mx(b.geo), gpuMBMax: MB(mx(b.gpuB)), heapMBMax: MB(mx(b.heap)),
      };
    }
    // GPU de primer uso por sección (cantidades y CPU de la llamada; el costo de GPU no se ve acá)
    const ge = gev.filter((e) => e.t >= rec.t0 && e.t <= t1);
    out.gpu = {};
    for (const e of ge) {
      const g = out.gpu[e.sec] || (out.gpu[e.sec] = { pipeSync: 0, pipeSyncMs: 0, pipeAsync: 0, shader: 0, texNew: 0, upload: 0, uploadMPx: 0, uploadMs: 0 });
      if (e.kind === 'pipeSync') { g.pipeSync++; g.pipeSyncMs += e.ms; }
      else if (e.kind === 'upload') { g.upload++; g.uploadMPx += e.px / 1e6; g.uploadMs += e.ms; }
      else g[e.kind]++;
    }
    for (const g of Object.values(out.gpu)) { g.pipeSyncMs = Math.round(g.pipeSyncMs); g.uploadMPx = +g.uploadMPx.toFixed(1); g.uploadMs = Math.round(g.uploadMs); }
    const lts = lt.filter((e) => e.t >= rec.t0 && e.t <= t1);
    out.longTasks = { n: lts.length, ms: Math.round(lts.reduce((a, e) => a + e.d, 0)), max: Math.round(mx(lts.map((e) => e.d))) };
    // LoAF: scripts con más tiempo acumulado
    const lf = loaf.filter((f) => f.t >= rec.t0 && f.t <= t1);
    const agg = {};
    for (const f of lf) for (const s of f.scripts) { const k = `${s.src} ${s.fn} (${s.inv.slice(0, 40)})`; agg[k] = (agg[k] || 0) + s.d; }
    out.loaf = { n: lf.length, ms: Math.round(lf.reduce((a, f) => a + f.d, 0)), blockingMs: Math.round(lf.reduce((a, f) => a + f.block, 0)), top: Object.entries(agg).sort((a, c) => c[1] - a[1]).slice(0, 8).map(([k, v]) => [k, Math.round(v)]) };
    return out;
  }

  const api = {
    start() { rec = newRec(); return true; },
    stop() { const s = summarize(); rec = null; return s; },
    snapshot() { return box.textContent; },
    /** eventos de GPU de primer uso de los últimos ms (por defecto 10 s): [{t, ms, kind, u, sec, px}] */
    gpuEvents(ms = 10000) { const t = performance.now() - ms; return gev.filter((e) => e.t >= t).map((e) => ({ ...e, t: Math.round(e.t), ms: +e.ms.toFixed(1) })); },
    /** objetos visibles de la escena en este instante (mallas y sprites; sin frustum culling): cuántos y de qué tipo */
    visible() {
      const out = { n: 0, sprites: 0, spriteInst: 0, meshes: 0, draw: info.render.drawCalls };
      if (ctl.scene) ctl.scene.traverseVisible((o) => { if (o.isSprite) { out.n++; out.sprites++; out.spriteInst += o.count || 1; } else if (o.isMesh) { out.n++; out.meshes++; } });
      return out;
    },
    hold(sec = 4) { rec = newRec(); return new Promise((res) => setTimeout(() => { const s = summarize(); rec = null; res(s); }, sec * 1000)); },
    // recorrido completo de arriba a abajo a vhPerSec viewports por segundo
    tour(vhPerSec = 1, fromTop = true) {
      return new Promise((res) => {
        if (fromTop) scrollTo({ top: 0, behavior: 'instant' });
        setTimeout(() => {
          rec = newRec();
          let prev = performance.now();
          const end = () => document.documentElement.scrollHeight - innerHeight - 2;
          const step = (now) => {
            const d = Math.min(now - prev, 100); prev = now;
            scrollBy({ top: (vhPerSec * innerHeight * d) / 1000, behavior: 'instant' });
            if (scrollY >= end()) { setTimeout(() => { const s = summarize(); rec = null; res(s); }, 1500); return; }
            requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }, 1200);
      });
    },
  };
  window.__perf = api;
  ctl.offs.push(() => {
    alive = false; cancelAnimationFrame(raf); clearInterval(zoneTimer); removeEventListener('resize', measureZones);
    obs.forEach((o) => o.disconnect()); box.remove(); renderer.setAnimationLoop = setLoop;
    if (window.__perf === api) delete window.__perf;
  });
  return api;
}
