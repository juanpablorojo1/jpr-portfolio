'use client';

/* Logo A «Asta» (elegido por Juan el 2026-10-10: «A, menú así»).
   Fuente: clients/jpr-portfolio/logo/sistema-a/nav-animable.svg — mismo dibujo que nav.svg, píxel a píxel,
   con las piezas separadas para animarlas: #jpr-letras > #jpr-asta, #jpr-panza, #jpr-gancho, y #jpr-pierna
   (trazo recortado por #jpr-base en la línea base, para dibujarlo de arriba abajo).
   Letras en currentColor; la pierna de la R es el único rojo (#E8272A). No recolorear, no sumar efectos.
   Hay dos instancias (barra y menú de celular): la barra lleva los ids canónicos y la otra los lleva con
   sufijo, así no hay ids duplicados y el clip-path de cada una apunta a su propio <clipPath>.

   Motion (`animated`, solo la barra): con el reloj del hero (onSignal → S.now), la pierna se dibuja de arriba
   abajo cuando aparece el cabezal de la traza (S.T_START, 1 s expo.out) y el logo late una vez en el primer
   pico R (S.T_R0) con la misma curva que el resplandor del hero (S.pulse). La línea de tiempo se posiciona
   con S.now() en cada tick, así que no se corre aunque el arranque tenga frames largos.
   Hasta que llega la señal, la pierna está sin dibujar por CSS (navbar.css, solo sin reduced motion).
   Reduced motion o hero estático (?static): estado final, quieto.
   El menú de celular no se anima: al abrirse, su barra cae exactamente sobre la de arriba, y redibujar
   la pierna ahí sería borrar y repetir algo que ya estaba. El logo es lo que queda quieto mientras el resto entra. */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { onSignal, type Senal } from '../hero/senal/signal';

gsap.registerPlugin(DrawSVGPlugin);

const DRAW = 1.0;        // s, entrada expo.out
const BEAT = 1.4;        // s, ataque + caída de S.pulse (cae al 2 % antes de terminar)
const BEAT_SCALE = 0.08; // escala en el pico del latido

/* El latido del hero (S.pulse) como ease: 0 → pico → 0, normalizado a 1 en el pico. */
function beatEase(S: Senal) {
  const shape = (x: number) => S.pulse(S.T_R0 + x);
  let peak = 0;
  for (let i = 1; i <= 300; i++) peak = Math.max(peak, shape((i / 300) * 0.3));
  return (p: number) => (p >= 1 ? 0 : shape(p * BEAT) / peak);
}

type Props = {
  /** Sufijo de los ids. Vacío = ids canónicos (la instancia de la barra). */
  idSuffix?: string;
  /** Dibuja la pierna y late con el primer latido del hero. Solo la instancia de la barra. */
  animated?: boolean;
};

export default function LogoMark({ idSuffix = '', animated = false }: Props) {
  const id = (name: string) => `jpr-${name}${idSuffix}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const legRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    const leg = legRef.current;
    if (!animated || !svg || !leg) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', (ctx) => {
      let tl: gsap.core.Timeline | null = null;
      let tick: (() => void) | null = null;
      const stopTick = () => { if (tick) gsap.ticker.remove(tick); tick = null; };

      // método con nombre: corre más tarde (cuando llega la señal) pero lo que crea queda en el contexto y se revierte
      const build = ctx.add('build', (S: Senal) => {
        stopTick();
        tl?.kill();
        if (S.dead) { gsap.set(leg, { drawSVG: '100%' }); return; }   // hero estático: logo entero
        tl = gsap.timeline({ paused: true })
          .fromTo(leg, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: DRAW, ease: 'expo.out' }, S.T_START)
          .fromTo(svg, { scale: 1 }, { scale: 1 + BEAT_SCALE, duration: BEAT, ease: beatEase(S), transformOrigin: '50% 50%' }, S.T_R0)
          .set(svg, { clearProps: 'transform' });
        const end = tl.duration();
        const line = tl;
        tick = () => {
          const t = S.now();
          line.time(Math.min(t, end));
          if (t >= end) stopTick();
        };
        gsap.ticker.add(tick);
        tick();
      }) as (S: Senal) => void;

      const off = onSignal(build);
      return () => { off(); stopTick(); };
    });
    // Reduced motion: el CSS ya no oculta la pierna; esto lo asegura también si CSS y JS no coinciden.
    mm.add('(prefers-reduced-motion: reduce)', () => { gsap.set(leg, { drawSVG: '100%' }); });
    return () => mm.revert();
  }, [animated]);

  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 106 101" focusable="false" aria-hidden="true">
      <defs>
        <clipPath id={id('base')}>
          <rect width="120" height="110" y="-10" />
        </clipPath>
      </defs>
      <path
        ref={legRef}
        id={id('pierna')}
        className="jpr-pierna"
        fill="none"
        stroke="#e8272a"
        strokeWidth="18.78"
        d="M70.5 50 98 105"
        clipPath={`url(#${id('base')})`}
      />
      <g id={id('letras')} fill="currentColor">
        <path id={id('asta')} d="M36 0h20v74H36Z" />
        <path
          id={id('panza')}
          d="M36 0h35a27 27 0 0 1 27 27v4a27 27 0 0 1-27 27H36Zm20 17v24h12a9 9 0 0 0 9-9v-6a9 9 0 0 0-9-9Z"
        />
        <path
          id={id('gancho')}
          d="M56 73v2a26 26 0 0 1-26 26h-4A26 26 0 0 1 0 75V64h19v12a8 8 0 0 0 8 8h1a8 8 0 0 0 8-8v-3Z"
        />
      </g>
    </svg>
  );
}
