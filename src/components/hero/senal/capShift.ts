/* Capacitaciones entre el About y Projects (C1 «Línea de lectura», Juan 2026-11-23: «Va C1»; portado de la maqueta bb71746).
   En escritorio con la escena viva todo lo que viene después del About (vitrina de Projects, Video, Stack, Experience,
   Contact) está coreografiado en u = viewports de scroll desde el aterrizaje del About (L). Una sección nueva en el
   medio corre todo eso D viewports (su alto). En vez de reescribir los guiones:
   - la escena se SOSTIENE en la pose del About (la recta roja horizontal, el piso) mientras pasa Capacitaciones:
     u' = u hasta CAP_HOLD_AT; CAP_HOLD_AT durante D viewports; después u − D.
   - lo que mide L para Projects en adelante suma D (capShiftPx), así el HTML y la escena siguen alineados.
   Sin la sección (la home en /en: Capacitaciones existe solo en español) D = 0 y todo queda idéntico a 31dd823.
   Requiere #capacitaciones con data-cap-hold (lo pone sections/Capacitaciones.tsx). */
import { GAL_ABOUT_OUT } from './gallery';

/** la escena se sostiene recién pasada la salida del About: el About ya se despidió, la cámara no empezó a girar */
export const CAP_HOLD_AT = GAL_ABOUT_OUT + 0.004;
/** con la sección, el About se despide por scroll real (sin amortiguar) un poco antes, cuando asoma el rótulo de
    Capacitaciones (padding-top 30vh en linea.css): u 0,30 en vez de 0,35 (design-critic D-01 / D-02) */
export const CAP_ABOUT_OUT = 0.3;

let el: HTMLElement | null = null;
let px = 0;
let ro: ResizeObserver | null = null;

function find(): void {
  if (el && el.isConnected) return;
  ro?.disconnect(); ro = null; el = null; px = 0;
  if (typeof document === 'undefined') return;
  const c = document.getElementById('capacitaciones');
  if (!c || !c.hasAttribute('data-cap-hold')) return;
  el = c;
  px = c.offsetHeight;
  ro = new ResizeObserver(() => { if (el) px = el.offsetHeight; });
  ro.observe(c);
}

/** alto de la sección en px (0 si no hay sección C) */
export function capShiftPx(): number {
  find();
  return px;
}

/** u del guion (u') a partir del u de scroll crudo */
export function capRemap(u: number): number {
  const D = capShiftPx() / Math.max(1, innerHeight);
  if (D <= 0 || u <= CAP_HOLD_AT) return u;
  return u < CAP_HOLD_AT + D ? CAP_HOLD_AT : u - D;
}

/** la sección ya salió por arriba del menú (o no hay sección): la vitrina puede volver transparente el menú (pj-vit) */
export function capCleared(): boolean {
  find();
  return !el || el.getBoundingClientRect().bottom <= 80;
}
