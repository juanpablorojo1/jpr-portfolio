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
  bajo: { dprCap: 0.85, msaa: false, bloomRes: 0.25, dust: 0.35, aniso: 4, lite: true, video720: true, frontOnly: true },
};

const DEDICATED = /nvidia|geforce|rtx|gtx|quadro|radeon\s*(rx|pro)|\barc\b|apple/;
const SOFTWARE = /swiftshader|llvmpipe|softpipe|basic render|microsoft basic|software/;
const INTEGRATED = /intel|uhd|iris|gen-?\d|radeon\(tm\)\s*graphics|radeon graphics|vega|mali|adreno|powervr|videocore/;

/** nombre de la GPU antes de crear el renderer (no abre nada visible; el contexto de prueba se suelta enseguida) */
export async function probeGpu(forceWebGL) {
  try {
    if (!forceWebGL && typeof navigator !== 'undefined' && navigator.gpu) {
      const ad = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      const i = ad && (ad.info || (ad.requestAdapterInfo ? await ad.requestAdapterInfo() : null));
      if (i) return [i.vendor, i.architecture, i.description || i.device].filter(Boolean).join(' · ');
    }
  } catch (e) { /* sigue con WebGL */ }
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const s = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    return s;
  } catch (e) { return ''; }
}

/** nivel de arranque: { level, ceiling, forced, reason } */
export function pickLevel(params, gpu) {
  const q = params && params.get('q');
  if (q && QUALITY[q]) return { level: q, ceiling: q, forced: true, reason: '?q=' + q };
  const g = String(gpu || '').toLowerCase();
  let i = 2, why = 'gpu desconocida';
  if (SOFTWARE.test(g)) { i = 0; why = 'gpu por software'; }
  else if (DEDICATED.test(g)) { i = 2; why = 'gpu dedicada'; }
  else if (INTEGRATED.test(g)) { i = 1; why = 'gpu integrada'; }
  const mem = navigator.deviceMemory, cores = navigator.hardwareConcurrency;
  if ((mem && mem <= 4) || (cores && cores <= 4)) { i = Math.max(0, i - 1); why += ` · ${mem || '?'} GB / ${cores || '?'} hilos`; }
  return { level: LEVELS[i], ceiling: LEVELS[i], forced: false, reason: why + (gpu ? ` (${gpu})` : '') };
}

/** video y póster por nivel (convención de 03-media-manifiesto.md §5: los 12 videos tienen -720.mp4; sólo los pósters
    verticales tienen -720) */
export const src720 = (v) => v.src.replace(/\.mp4$/, '-720.mp4');
export const poster720 = (v) => (v.width < v.height ? v.poster.replace(/\.(webp|jpg)$/, '-720.$1') : v.poster);
