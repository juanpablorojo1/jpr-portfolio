/* Projects «Negatoscopio» · el video demo de cada placa (Track C, 2026-10-11). Módulo propio para que corridor.js
   sólo enganche tres puntos: la muestra en el shader de la placa principal, update() en su frame y nada más.

   - Fuente: PROJECT_DEMOS (content.ts), por id de GAL_PROJECTS. <video> fuera del DOM, mudo, en loop, inline; el MP4
     H.264 si el navegador lo decodifica y, si no (o si falla), el WebM VP9. Como Frame by Frame (projector.js): el src
     se pone recién cerca de su estadía y el cuadro se sube a la textura sólo cuando cambia.
   - Aparece sobre la captura fija cuando la placa está en foco (su estadía; TraumaVision, después del barrido) y se
     funde de vuelta a la captura al salir. Corre sólo a la vista, con la pestaña visible, sin caso abierto y sin la
     pausa del usuario (S.neg.paused, botón en ProjectsGallery.tsx: WCAG 2.2.2); pausado, la placa queda en ese cuadro.
   - Encuadre: el video es 16:9 y la placa 1600:756; entra entero (contain), con los costados del fondo del video.
   - LEEX (blur): el cuadro pasa por un canvas con el mismo desenfoque que su captura (texOf, 9 px). Sigue desenfocado.
   - Si el loop de la escena se detiene (pestaña oculta, hero tapado, galería cerrada), update() deja de llamarse: un
     vigía pausa los videos a los 350 ms sin frames. */
import * as THREE from 'three/webgpu';
import { uniform, texture, vec2, vec3, vec4, float, step, mix, clamp } from 'three/tsl';
import { PROJECT_DEMOS } from '../../../lib/content';

const PLATE_ASPECT = 1600 / 756;
const BG = 0.0035;                 // fondo del video (≈ #0b0b0b en sRGB), lineal
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));

export function createPlateVideos({ ST, S, ctl, alive, blurPx = 9 }) {
  const recs = ST.map((st) => {
    const d = PROJECT_DEMOS[st.id];
    if (!d) return null;
    const blur = !!st.blur;
    return {
      st, d, blur,
      k: uniform(0),
      // contain en x: el canvas del desenfoque ya trae el encuadre de la placa
      fit: uniform(blur ? 1 : PLATE_ASPECT / (d.width / d.height)),
      tn: null, v: null, tex: null, cv: null, cx: null, last: -1, triedWebm: false,
    };
  });

  /** Muestra de la placa principal k: la captura fija (stillSample, vec4) con el video encima según su peso. */
  function over(k, uvN, stillSample, placeholderTex) {
    const r = recs[k];
    if (!r) return stillSample;
    const x = uvN.x.sub(0.5).mul(r.fit).add(0.5);
    const inside = step(0, x).mul(step(x, 1));
    r.tn = texture(placeholderTex, vec2(clamp(x, 0, 1), uvN.y));
    const vid = r.tn.rgb.mul(inside).add(vec3(BG).mul(float(1).sub(inside)));
    return vec4(mix(stillSample.rgb, vid, r.k), 1);
  }

  function setSrc(r, webm) {
    r.v.src = webm ? r.d.webm : r.d.mp4;
    r.v.load();                                    // explícito: fuera del DOM Chrome puede no empezar a cargar solo
  }
  function ensure(r) {
    if (r.v) return;
    const v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    v.preload = 'auto';
    r.v = v;
    v.addEventListener('loadeddata', () => {
      if (!alive() || r.tex) return;
      if (r.blur) {
        r.cv = document.createElement('canvas'); r.cv.width = 1024; r.cv.height = Math.round(1024 / PLATE_ASPECT);
        r.cx = r.cv.getContext('2d');
        r.tex = new THREE.CanvasTexture(r.cv);
      } else {
        r.tex = new THREE.VideoTexture(v);
      }
      r.tex.colorSpace = THREE.SRGBColorSpace;
      r.tex.generateMipmaps = false;
      r.tex.minFilter = THREE.LinearFilter;
      ctl.texs.push(r.tex);
      r.last = -1;
      r.tn.value = r.tex;
    });
    // sin H.264 (o si el MP4 falla): el WebM
    v.addEventListener('error', () => { if (!r.triedWebm && alive()) { r.triedWebm = true; setSrc(r, true); } });
    const h264 = v.canPlayType('video/mp4; codecs="avc1.64001F"') || v.canPlayType('video/mp4');
    r.triedWebm = !h264;
    setSrc(r, !h264);
  }

  // el cuadro del video, desenfocado y con el encuadre de la placa (LEEX)
  function drawBlur(r) {
    const c = r.cv, x = r.cx, w = c.height * r.d.width / r.d.height;
    x.filter = 'none'; x.fillStyle = '#0b0b0b'; x.fillRect(0, 0, c.width, c.height);
    x.filter = `blur(${blurPx}px)`;
    x.drawImage(r.v, (c.width - w) / 2 - 20, -20, w + 40, c.height + 40);
    x.filter = 'none';
  }

  function pauseAll() { recs.forEach((r) => { if (r && r.v && !r.v.paused) r.v.pause(); }); }

  let lastTick = 0;
  const watch = setInterval(() => { if (performance.now() - lastTick > 350) pauseAll(); }, 500);
  ctl.offs.push(() => {
    clearInterval(watch);
    recs.forEach((r) => { if (!r || !r.v) return; try { r.v.pause(); r.v.removeAttribute('src'); r.v.load(); } catch (e) { /* noop */ } });
  });

  /** Por frame (corridor.update). focused(k): la placa k está en foco y lista para el demo (su estadía y, con
      barrido, el barrido terminado). */
  function update(u, dt, gw, dwells, focused) {
    lastTick = performance.now();
    recs.forEach((r, k) => {
      if (!r) return;
      const [d0, d1] = dwells[k];
      if (gw > 0.5 && u > d0 - 0.9 && u < d1 + 0.6) ensure(r);
      const shown = gw > 0.5 && focused(k);
      const v = r.v;
      if (!v) { r.k.value = damp(r.k.value, 0, 3, dt); return; }
      const run = shown && S.inView && !document.hidden && S.neg.open < 0 && !S.neg.paused;
      if (run && v.paused) v.play().catch(() => {});
      else if (!run && !v.paused) v.pause();
      // sube un cuadro nuevo sólo cuando cambia
      if (r.tex && v.readyState >= 2 && v.currentTime !== r.last) {
        r.last = v.currentTime;
        if (r.blur) drawBlur(r);
        r.tex.needsUpdate = true;
      }
      r.k.value = damp(r.k.value, shown && r.tex && r.last >= 0 ? 1 : 0, 3, dt);
    });
  }

  return { over, update, pauseAll };
}
