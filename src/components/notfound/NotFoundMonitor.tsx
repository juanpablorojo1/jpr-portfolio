'use client';

/* 404 «Señal»: el monitor en línea plana (U7).
   La misma gramática del hero: la traza cruza la pantalla a la altura del horizonte (64 % del alto; 55 % en celular),
   el titular se apoya sobre ella y los datos van debajo. Acá la señal no está: el cabezal barre y escribe una línea
   plana (fósforo que se apaga detrás, hueco que borra delante, como el hero). El botón la reanima: el cabezal escribe
   dos latidos (el mismo complejo P-QRS-T del hero, signal.ts) y la página vuelve al inicio.
   Canvas 2D liviano, sin la escena 3D. Reduced motion: línea quieta (CSS) y el enlace navega en el acto.
   Sin JS: la línea CSS y un enlace normal a /{locale}. */

import { useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import LogoMark from '../layout/LogoMark';
import LanguageSelector from '../ui/LanguageSelector';
import './notfound.css';

const N = 700;              // muestras a lo largo de la línea
const SPEED = 0.3;          // fracción de la línea por segundo (la del hero)
const BEATS = [0.12, 0.84]; // s desde el clic: los dos latidos que la reaniman
const LEAVE = 1.45;         // s desde el clic: vuelve al inicio

const g = (t: number, mu: number, s: number) => Math.exp(-((t - mu) * (t - mu)) / (2 * s * s));
/** el complejo del hero (signal.ts, S.ecg) alrededor de su pico R en r = 0 */
const complex = (r: number) =>
  0.10 * g(r, -0.17, 0.035) - 0.13 * g(r, -0.028, 0.011) + 1.0 * g(r, 0, 0.012) - 0.30 * g(r, 0.03, 0.013) + 0.22 * g(r, 0.29, 0.06);
/** el resplandor del latido (S.pulse) */
const pulseAt = (x: number) => (x >= 0 && x < 3 ? (1 - Math.exp(-x / 0.02)) * Math.exp(-x / 0.38) : 0);

export default function NotFoundMonitor() {
  const t = useTranslations('notfound');
  const tHero = useTranslations('hero');
  const locale = useLocale();
  const home = `/${locale}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const kickRef = useRef<(href: string) => boolean>(() => false);

  useEffect(() => { document.title = t('meta_title'); }, [t]);

  useEffect(() => {
    const root = rootRef.current;
    const cv = root?.querySelector<HTMLCanvasElement>('.nf-trace');
    const glow = root?.querySelector<HTMLElement>('.nf-glow');
    if (!root || !cv || !glow) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce.matches) return;
    const cx = cv.getContext('2d');
    if (!cx) return;
    root.setAttribute('data-run', '');

    const val = new Float32Array(N), wrote = new Float32Array(N).fill(-1);
    const t0 = performance.now();
    const now = () => (performance.now() - t0) / 1000;
    let headS = 0, kick = -1, left = false, raf = 0, dpr = 1, leaveTimer = 0;
    const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); };
    size(); addEventListener('resize', size);

    const signalAt = (tw: number) => {
      if (kick < 0) return 0;
      let v = 0;
      for (const b of BEATS) v += complex(tw - (kick + b));
      return v;
    };
    const write = (tt: number) => {
      const prev = headS;
      headS = (tt * SPEED) % 1;
      const i0 = Math.floor(prev * N), i1 = Math.floor(headS * N);
      const span = (i1 - i0 + N) % N;
      for (let k = 1; k <= span; k++) {
        const i = (i0 + k) % N;
        const tw = tt - (((headS - i / N) % 1 + 1) % 1) / SPEED;
        val[i] = signalAt(tw) + (Math.random() - 0.5) * 0.008;
        wrote[i] = tw;
      }
    };
    const bright = (i: number, tt: number) => {
      if (wrote[i] < 0) return 0;
      let br = 0.22 + 0.78 * Math.exp(-(tt - wrote[i]) / 1.3);
      const ahead = ((i / N) - headS + 1) % 1;
      if (ahead < 0.05) { const k = Math.min(1, Math.max(0, (ahead - 0.022) / 0.028)); br *= k * k * (3 - 2 * k); }
      return br;
    };

    const draw = () => {
      const tt = now();
      write(tt);
      const W = innerWidth, H = innerHeight, m = W < 900;
      const y0 = (m ? 0.55 : 0.64) * H, ampPx = (m ? 0.054 : 0.093) * H, core = Math.max(1.4, 0.0034 * H);
      const X = (i: number) => (0.5 + ((i / (N - 1)) * 2 - 1) * 0.54) * W;
      const Y = (i: number) => y0 - val[i] * ampPx;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx.clearRect(0, 0, W, H);
      cx.globalCompositeOperation = 'lighter'; cx.lineCap = 'round'; cx.lineJoin = 'round';
      const CH = 6;
      for (let a = 0; a < N - 1; a += CH) {
        const b = Math.min(N - 1, a + CH);
        let br = 0; for (let i = a; i <= b; i++) br += bright(i, tt); br /= (b - a + 1);
        if (br < 0.01) continue;
        cx.beginPath(); cx.moveTo(X(a), Y(a)); for (let i = a + 1; i <= b; i++) cx.lineTo(X(i), Y(i));
        cx.strokeStyle = `rgba(232,39,42,${(0.09 * br).toFixed(3)})`; cx.lineWidth = core * 9; cx.stroke();
        cx.strokeStyle = `rgba(232,39,42,${(0.22 * br).toFixed(3)})`; cx.lineWidth = core * 3.2; cx.stroke();
        cx.strokeStyle = `rgba(255,86,88,${Math.min(1, br * 1.1).toFixed(3)})`; cx.lineWidth = core; cx.stroke();
      }
      // cabezal
      const hi = Math.min(N - 1, Math.floor(headS * N));
      const hx = X(hi), hy = Y(hi), r = 0.0035 * H * 9;
      const gr = cx.createRadialGradient(hx, hy, 0, hx, hy, r);
      gr.addColorStop(0, 'rgba(255,120,120,.95)'); gr.addColorStop(0.25, 'rgba(232,39,42,.5)'); gr.addColorStop(1, 'rgba(232,39,42,0)');
      cx.fillStyle = gr; cx.beginPath(); cx.arc(hx, hy, r, 0, Math.PI * 2); cx.fill();
      cx.globalCompositeOperation = 'source-over';
      // el resplandor rojo detrás del titular late con cada latido de la reanimación
      if (kick >= 0) {
        let p = 0; for (const b of BEATS) p = Math.max(p, pulseAt(tt - (kick + b)));
        glow.style.opacity = (p * 0.9).toFixed(3);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(draw); };
    document.addEventListener('visibilitychange', onVis);

    // el botón: reanima y vuelve al inicio (un clic repetido no reinicia nada)
    kickRef.current = (href: string) => {
      if (left) return true;
      left = true;
      kick = now();
      root.setAttribute('data-kick', '');
      leaveTimer = window.setTimeout(() => { window.location.assign(href); }, LEAVE * 1000);
      return true;
    };

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(leaveTimer);
      removeEventListener('resize', size);
      document.removeEventListener('visibilitychange', onVis);
      kickRef.current = () => false;
      root.removeAttribute('data-run');
      root.removeAttribute('data-kick');
    };
  }, []);

  const onCta = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (kickRef.current(e.currentTarget.href)) e.preventDefault();
  };

  return (
    <div ref={rootRef} className="nf">
      <header className="nf-bar">
        <a className="nf-logo" href={home} aria-label={`${tHero('title')} ${tHero('surname')}`}>
          <LogoMark idSuffix="-404" />
        </a>
        <LanguageSelector />
      </header>

      <main className="nf-main">
        <div className="nf-line" aria-hidden="true" />
        <canvas className="nf-trace" aria-hidden="true" />
        <div className="nf-glow" aria-hidden="true" />

        <div className="nf-top">
          <p className="nf-label"><span className="nf-sq" aria-hidden="true" />{t('label')}</p>
          <h1 className="nf-title">{t('title')}</h1>
        </div>
        <div className="nf-bottom">
          <p className="nf-body">{t('body')}</p>
          <a className="nf-btn" href={home} onClick={onCta} aria-label={t('cta_aria')}>
            <span>{t('cta')}</span>
          </a>
        </div>
      </main>
    </div>
  );
}
