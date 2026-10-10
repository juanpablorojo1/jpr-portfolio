/* «Señal»: hero en HTML/2D desde el primer frame (port de la maqueta a-senal/hero.js).
   - Es dueño del reloj, del scroll (objetivo + damping) y de toda la coreografía HTML.
   - Dibuja el intro de la traza en un canvas 2D hasta que la escena 3D está lista y se funde encima.
   - Es también el camino estático (reduced motion / ?static / sin GPU).
   Las clases de estado (is-loading, is-lit, is-live, is-handed, is-static) viven en el wrapper .senal,
   no en <html>, para no pelear con la hidratación de React. */
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import type { Senal } from './signal';

gsap.registerPlugin(SplitText);

type Opts = { channels: string[] };

export function initHero(root: HTMLElement, S: Senal, { channels }: Opts): () => void {
  const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const cleanups: Array<() => void> = [];
  let disposed = false;

  // grano de película: textura generada una vez
  (function makeNoise() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d'); if (!x) return;
    const d = x.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0);
    root.style.setProperty('--noise', `url(${c.toDataURL()})`);
  })();

  // hero.marquee de messages/{locale}.json → canales del monitor
  const CHANNELS = channels.length ? channels : [''];

  /* ---------- texto ---------- */
  const heroInner = q('.hero-inner');
  const channelEl = q('.ch-text');
  const rojoGlow = q('.rojo-glow');
  let nameSplit: SplitText | null = null, tagSplit: SplitText | null = null;
  let textReady = false, revealed = false, glowOn = false;
  let tl: gsap.core.Timeline | null = null;

  function goStatic(reason?: string) {
    if (disposed) return;
    if (reason) console.info('[senal] static:', reason);
    S.dead = true;
    root.classList.add('is-static');
    root.classList.remove('is-loading', 'is-live', 'is-handed');
    if (tl) tl.kill();
    if (nameSplit) { gsap.killTweensOf(nameSplit.chars); nameSplit.revert(); nameSplit = null; }
    if (tagSplit) { gsap.killTweensOf(tagSplit.chars); tagSplit.revert(); tagSplit = null; }
    gsap.set(root.querySelectorAll('[data-reveal], .channel'), { clearProps: 'all' });
  }
  S.goStatic = goStatic;

  if (root.classList.contains('is-static')) {
    goStatic(matchMedia('(prefers-reduced-motion: reduce)').matches ? 'prefers-reduced-motion' : '?static');
    return () => { disposed = true; S.goStatic = () => {}; };
  }

  document.fonts.ready.then(() => {
    if (disposed || S.dead) return;
    nameSplit = SplitText.create(root.querySelectorAll('.name [data-split]'), { type: 'chars', mask: 'chars', charsClass: 'char' });
    tagSplit = SplitText.create(q('.tagline'), { type: 'words,chars', wordsClass: 'word', charsClass: 'char' });
    // Chrome corta antes del espacio que sigue a un inline-block → sangría falsa en la línea 2.
    const tg = q('.tagline'); const cs = getComputedStyle(tg);
    const ctx = document.createElement('canvas').getContext('2d');
    if (ctx) {
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const sp = ctx.measureText(' ').width;
      tagSplit.words.forEach((w) => { const n = w.nextSibling; if (n && n.nodeType === 3) { n.remove(); (w as HTMLElement).style.marginRight = sp + 'px'; } });
    }
    gsap.set(nameSplit.chars, { yPercent: 108 });
    gsap.set(tagSplit.chars, { z: -1100, y: 24, rotationX: -38, opacity: 0 });
    textReady = true;
    if (revealed) runReveal(S.now() - S.T_R0);
  });

  function runReveal(late: number) {
    if (!nameSplit || !tagSplit) return;
    root.classList.remove('is-loading');
    tl = gsap.timeline();
    tl.to(nameSplit.chars, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.04 }, 0.12)
      .to(tagSplit.chars, { z: 0, y: 0, rotationX: 0, opacity: 1, duration: 1.4, ease: 'expo.out', stagger: 0.014 }, 0.38)
      .fromTo(root.querySelectorAll('[data-reveal]'), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 1.0, ease: 'expo.out', stagger: 0.08 }, 0.55)
      .fromTo(q('.channel'), { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'expo.out' }, 1.1)
      .call(() => { glowOn = true; }, undefined, 1.0);
    // El tagline queda partido a propósito: revertirlo crea un bloque de texto "nuevo" y el LCP salta a ~4,4 s.
    // SplitText deja aria-label en el tagline, así que los lectores de pantalla leen la frase entera.
    if (late > 0) tl.seek(late, false);
  }

  let channelIdx = 0;
  let swapTimer = 0;
  function nextChannel() {
    channelIdx = (channelIdx + 1) % CHANNELS.length;
    channelEl.classList.add('is-swapping');
    swapTimer = window.setTimeout(() => { channelEl.textContent = CHANNELS[channelIdx]; channelEl.classList.remove('is-swapping'); }, 260);
  }
  cleanups.push(() => clearTimeout(swapTimer));

  if (matchMedia('(pointer: fine)').matches) {
    root.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
      const qx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'expo.out' });
      const qy = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'expo.out' });
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        qx((e.clientX - r.left - r.width / 2) * 0.22); qy((e.clientY - r.top - r.height / 2) * 0.3);
      };
      const leave = () => { qx(0); qy(0); };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      cleanups.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); gsap.set(el, { clearProps: 'transform' }); });
    });
  }

  /* ---------- intro 2D de la traza (misma proyección que la cámara 3D en reposo) ---------- */
  const cv = q<HTMLCanvasElement>('.senal-intro');
  const cx = cv.getContext('2d')!;
  let dpr = 1;
  function size() { dpr = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); }
  size(); addEventListener('resize', size);
  cleanups.push(() => removeEventListener('resize', size));
  function draw2D(t: number) {
    const W = innerWidth, H = innerHeight, G = S.geom(W, H);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W, H);
    if (t < S.T_START) return;
    const y0 = G.horizon * H, ampPx = G.amp * G.pxPerUnit, core = Math.max(1.4, G.coreHalf * 2 * G.pxPerUnit);
    const X = (i: number) => (0.5 + ((i / (S.N - 1)) * 2 - 1) * G.halfWFrac) * W;
    const Y = (i: number) => y0 - S.val[i] * ampPx;
    cx.globalCompositeOperation = 'lighter'; cx.lineCap = 'round'; cx.lineJoin = 'round';
    const CH = 6;
    for (let a = 0; a < S.N - 1; a += CH) {
      const b = Math.min(S.N - 1, a + CH);
      let br = 0; for (let i = a; i <= b; i++) br += S.bright(i, t); br /= (b - a + 1);
      if (br < 0.01) continue;
      cx.beginPath(); cx.moveTo(X(a), Y(a)); for (let i = a + 1; i <= b; i++) cx.lineTo(X(i), Y(i));
      cx.strokeStyle = `rgba(232,39,42,${(0.09 * br).toFixed(3)})`; cx.lineWidth = core * 9; cx.stroke();
      cx.strokeStyle = `rgba(232,39,42,${(0.22 * br).toFixed(3)})`; cx.lineWidth = core * 3.2; cx.stroke();
      cx.strokeStyle = `rgba(255,86,88,${Math.min(1, br * 1.1).toFixed(3)})`; cx.lineWidth = core; cx.stroke();
    }
    const hi = Math.min(S.N - 1, Math.floor(S.headS * S.N));
    const hx = X(hi), hy = Y(hi), r = 0.08 * G.pxPerUnit * 1.6, ha = S.headAlpha(t);
    const gr = cx.createRadialGradient(hx, hy, 0, hx, hy, r);
    gr.addColorStop(0, `rgba(255,120,120,${ha})`); gr.addColorStop(0.25, `rgba(232,39,42,${0.55 * ha})`); gr.addColorStop(1, 'rgba(232,39,42,0)');
    cx.fillStyle = gr; cx.beginPath(); cx.arc(hx, hy, r, 0, Math.PI * 2); cx.fill();
    cx.globalCompositeOperation = 'source-over';
  }

  /* ---------- relevo al 3D ---------- */
  let handTimer = 0;
  S.onLive = function () {
    if (S.dead || disposed) return;
    root.classList.add('is-live');               // el canvas 3D se funde encima (0,6 s)
    handTimer = window.setTimeout(() => { if (!S.dead) { root.classList.add('is-handed'); S.handoff = true; } }, 700);
  };
  cleanups.push(() => clearTimeout(handTimer));

  /* ---------- loop ---------- */
  const st = S.state;
  st.lastScroll = scrollY;
  const onScroll = () => { st.pTarget = Math.min(1, Math.max(0, scrollY / (innerHeight * 3))); };
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });
  cleanups.push(() => removeEventListener('scroll', onScroll));
  let last = performance.now();
  let raf = 0;
  function tick(now: number) {
    if (S.dead || disposed) return;
    const dt = Math.min((now - last) / 1000, 1 / 20); last = now;
    const t = S.now(); st.t = t;
    const sy = scrollY;
    st.vel = S.damp(st.vel, Math.abs(sy - st.lastScroll) / Math.max(dt, 1e-3) / innerHeight, 6, dt); st.lastScroll = sy;
    st.p = S.damp(st.p, st.pTarget, 3.6, dt);

    if (S.write(t, st.vel)) nextChannel();
    if (!revealed && t >= S.T_R0) {
      revealed = true; root.classList.add('is-lit');
      if (textReady) runReveal(t - S.T_R0);
    }
    if (glowOn) rojoGlow.style.opacity = (0.08 + S.pulse(t) * 0.6).toFixed(3);
    const p = st.p;
    heroInner.style.opacity = (1 - S.smooth(0.01, 0.09, Math.min(1, Math.max(0, sy / (innerHeight * 3))))).toFixed(3);   // fade atado al scroll real (sin damping): el nombre se apaga antes de cruzar el nav
    heroInner.style.transform = `translate3d(0, ${(-p * 140).toFixed(2)}px, 0)`;
    if (!S.handoff) draw2D(t);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  cleanups.push(() => cancelAnimationFrame(raf));

  return () => {
    disposed = true;
    S.dead = true;
    S.goStatic = () => {};
    S.onLive = () => {};
    cleanups.forEach((f) => f());
    if (tl) tl.kill();
    if (nameSplit) nameSplit.revert();
    if (tagSplit) tagSplit.revert();
    root.classList.remove('is-lit', 'is-live', 'is-handed');
    root.classList.add('is-loading');
    heroInner.style.opacity = ''; heroInner.style.transform = '';
  };
}
