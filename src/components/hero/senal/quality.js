/* Niveles de calidad de la escena «Señal» (perf, 2026-10-17; plan 02-plan.md, «Después: niveles de calidad»).
   Juan: «Necesito optimizar el sitio. que sea mas liviano y no requiera una buena pc.» Alto = el sitio de hoy, idéntico;
   medio y bajo simplifican lo que casi no se nota en una PC modesta (resolución, partículas, videos 720p).

   Cómo se elige (al arrancar, antes de crear el renderer: el MSAA se decide ahí):
   - `?q=alto|medio|bajo` lo fuerza (sin ajuste en vivo).
   - Si no, la GPU: WebGPU `adapter.info` (o `UNMASKED_RENDERER_WEBGL` en el respaldo WebGL 2). Dedicada (NVIDIA, Radeon RX/Pro,
     Arc, Apple) → alto; integrada (Intel UHD/Iris, Radeon Graphics/Vega, Mali, Adreno…) → medio; software → bajo;
     desconocida → alto. Con `deviceMemory` ≤ 4 GB o `hardwareConcurrency` ≤ 4 baja un nivel.
   - En vivo (scene.js): ventanas de frames reales (la primera, de 60, es la prueba corta de frame time). < 48 fps → baja
     un nivel; ≥ 57 fps en ventanas seguidas → sube uno, nunca por encima del nivel con que arrancó; si al subir vuelve a
     caer, la próxima subida pide el doble de ventanas (2 → 4 → 8 → 16: no oscila). En bajo, si ni así llega (< 24 fps
     en 4 ventanas seguidas con la ventana al frente) → la versión estática (`S.goStatic`), como con reduced motion.
   Lo que se fija al arrancar y no cambia en vivo (cambiarlo recompila todos los pipelines): MSAA, anisotropía, materiales
   de la notebook. Lo que cambia en vivo (sólo con el scroll quieto: cambiar el tamaño de los render targets recompila
   el DOF y el bloom): DPR, resolución del bloom, cantidad de polvo. El video 720 y «sólo la cara de frente con src»
   se aplican en la próxima asignación de cada cara. */

export const LEVELS = ['bajo', 'medio', 'alto'];

/** palancas por nivel (alto = hoy) */
export const QUALITY = {
  alto: { dprCap: 2, msaa: true, bloomRes: 0.5, dust: 1, aniso: 16, lite: false, video720: false, frontOnly: false },
  medio: { dprCap: 1, msaa: true, bloomRes: 0.25, dust: 0.6, aniso: 8, lite: true, video720: true, frontOnly: false },
  // bajo con MSAA 4× (WebGPU sólo admite 1 o 4 muestras): sin él, a DPR 0,85 se dentaban el borde de la pantalla de la
  // notebook y las cintas rojas. Costo medido con __senal.bench (CPU+GPU por cuadro, Intel UHD, 1536×730): Projects
  // 7,35 → 7,16 ms (ruido), Tambor 6,12 → 7,62 ms. Sin pasada nueva (FXAA sumaba un render a pantalla completa).
  bajo: { dprCap: 0.85, msaa: true, bloomRes: 0.25, dust: 0.35, aniso: 4, lite: true, video720: true, frontOnly: true },
};

// dedicada primero (C-08). Intel Arc dedicada: «xe-hpg» por WebGPU, «Arc(TM) A770 / B580» por WebGL; la Arc integrada
// de Meteor/Lunar Lake («xe-lpg», «xe2», «Arc(TM) Graphics») es integrada (R-03)
const DEDICATED = /nvidia|geforce|rtx|gtx|quadro|radeon(\(tm\))?\s*(rx|pro)|xe-hpg|arc(\(tm\))?\s*[ab]\d{3}|apple/;
const SOFTWARE = /swiftshader|llvmpipe|softpipe|basic render|microsoft basic|software/;
const INTEGRATED = /intel|uhd|iris|gen-?\d|xe-lpg|xe2|arc(\(tm\))?\s*graphics|radeon(\(tm\))?\s*graphics|radeon(\(tm\))?\s*\d{3}m\b|vega|mali|adreno|powervr|videocore/;
const classify = (s) => (SOFTWARE.test(s) ? 0 : DEDICATED.test(s) ? 2 : INTEGRATED.test(s) ? 1 : -1);

/** Nombre de la GPU antes de crear el renderer (no abre nada visible; el contexto de prueba se suelta enseguida).
    Junta lo que da WebGPU (`adapter.info`) con `UNMASKED_RENDERER_WEBGL` (C-04/C-07): WebGPU en una AMD integrada da
    sólo «amd · gcn-5» (sin descripción) y Firefox/Safari lo dan vacío; el string de WebGL nombra el modelo. */
export async function probeGpu(forceWebGL) {
  const parts = [];
  try {
    if (!forceWebGL && typeof navigator !== 'undefined' && navigator.gpu) {
      const ad = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      const i = ad && (ad.info || (ad.requestAdapterInfo ? await ad.requestAdapterInfo() : null));
      const s = i ? [i.vendor, i.architecture, i.description || i.device].filter(Boolean).join(' · ') : '';
      if (s) parts.push('webgpu: ' + s);
    }
  } catch (e) { /* sigue con WebGL */ }
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2', { powerPreference: 'high-performance' }) || c.getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const s = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
      const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
      if (s) parts.push('webgl: ' + s);
    }
  } catch (e) { /* sin dato */ }
  return parts.join(' | ');
}

/** nivel de arranque: { level, ceiling, forced, reason }. `nav`: navigator (deviceMemory, hardwareConcurrency) */
export function pickLevel(params, gpu, nav = typeof navigator !== 'undefined' ? navigator : {}) {
  const q = params && params.get('q');
  if (q && QUALITY[q]) return { level: q, ceiling: q, forced: true, reason: '?q=' + q };
  // R-03: manda el adapter de WebGPU (el que usa three); WebGL sólo si WebGPU es ambiguo (no está, o es «amd · gcn-5 /
  // rdna-N» sin modelo): en un Optimus WebGL puede nombrar la NVIDIA mientras three dibuja en la Intel
  const g = String(gpu || '').toLowerCase();
  const part = (k) => { const m = g.split(' | ').find((p) => p.startsWith(k + ':')); return m ? m.slice(k.length + 1).trim() : null; };
  const wgpu = part('webgpu'), wgl = part('webgl');
  let c;
  if (wgpu == null && wgl == null) c = classify(g);                            // un solo string (sin prefijos)
  else {
    const ambiguous = !wgpu || (/^amd\b/.test(wgpu) && !/radeon/.test(wgpu));
    c = !ambiguous ? classify(wgpu) : -1;
    if (c < 0 && wgl) c = classify(wgl);
    if (c < 0 && wgpu) c = classify(wgpu);
  }
  let i = 2, why = 'gpu desconocida';
  if (c === 0) { i = 0; why = 'gpu por software'; }
  else if (c === 2) { i = 2; why = 'gpu dedicada'; }
  else if (c === 1) { i = 1; why = 'gpu integrada'; }
  const mem = nav.deviceMemory, cores = nav.hardwareConcurrency;
  if ((mem && mem <= 4) || (cores && cores <= 4)) { i = Math.max(0, i - 1); why += ` · ${mem || '?'} GB / ${cores || '?'} hilos`; }
  return { level: LEVELS[i], ceiling: LEVELS[i], forced: false, reason: why + (gpu ? ` (${gpu})` : '') };
}

/* ---------- ajuste en vivo: máquina de estados pura (scene.js la alimenta con el fps de cada ventana) ----------
   Cada ventana se mide con el nivel EFECTIVO (el que está dibujando): mientras un cambio espera el scroll quieto,
   scene.js no mide (C-01). Baja de a un escalón; sube de a uno hasta el techo; la versión estática sólo desde bajo. */
// bounceWindows: una caída cuenta como rebote de una subida sólo dentro de esas ventanas (~10 s); bounceLock: con esos
// rebotes, el techo queda en el nivel al que se volvió y no se intenta subir más en la sesión (C-09)
export const ADAPT = { down: 48, up: 57, dead: 24, deadWindows: 4, needMax: 16, bounceWindows: 5, bounceLock: 3 };
/** estado inicial: nivel de arranque y techo (= el de arranque) */
export function initAdaptive(level, ceiling = level) { return { level, ceiling, need: 2, good: 0, bad: 0, wasUp: false, sinceUp: 0, bounces: 0 }; }
/** un paso: fps de una ventana medida en `st.level`. Devuelve { state, action }, action = null |
    { type: 'level', level } | { type: 'static' }. `focused`: la ventana al frente (sin foco no se cae a estático). */
export function stepAdaptive(st, f, { focused = true } = {}) {
  const s = { ...st };
  const i = LEVELS.indexOf(s.level), top = LEVELS.indexOf(s.ceiling);
  if (s.wasUp && ++s.sinceUp > ADAPT.bounceWindows) s.wasUp = false;   // la subida se sostuvo: ya no es rebote
  if (f < ADAPT.down) {
    s.good = 0;
    if (i > 0) {
      if (s.wasUp) {                                                  // volvió a caer enseguida después de subir
        s.need = Math.min(s.need * 2, ADAPT.needMax);                 // subir cuesta el doble
        if (++s.bounces >= ADAPT.bounceLock) s.ceiling = LEVELS[i - 1];   // y tras varios rebotes, no sube más
      }
      s.wasUp = false; s.bad = 0;
      s.level = LEVELS[i - 1];
      return { state: s, action: { type: 'level', level: s.level } };
    }
    if (f < ADAPT.dead && focused) { if (++s.bad >= ADAPT.deadWindows) return { state: s, action: { type: 'static' } }; }
    else s.bad = 0;
    return { state: s, action: null };
  }
  s.bad = 0;
  if (f >= ADAPT.up && i < top) {
    if (++s.good >= s.need) { s.good = 0; s.wasUp = true; s.sinceUp = 0; s.level = LEVELS[i + 1]; return { state: s, action: { type: 'level', level: s.level } }; }
  } else s.good = 0;
  return { state: s, action: null };
}

/** video y póster por nivel (convención de 03-media-manifiesto.md §5: los 12 videos tienen -720.mp4; sólo los pósters
    verticales tienen -720) */
export const src720 = (v) => v.src.replace(/\.mp4$/, '-720.mp4');
export const poster720 = (v) => (v.width < v.height ? v.poster.replace(/\.(webp|jpg)$/, '-720.$1') : v.poster);
