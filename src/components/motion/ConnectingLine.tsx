'use client';

import { useEffect, useRef } from 'react';
import { CINEMATIC } from '../../lib/transitionConfig';

// Thin red vertical line that pulses as a section is being covered by the next.
// Visual "thread" stitching the card-stack sections together.

export default function ConnectingLine() {
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cleanup = false;
    let st: any;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const animate = async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      if (cleanup || !lineRef.current) return;

      const el = lineRef.current;
      const parent = el.parentElement;
      if (!parent) return;

      gsap.set(el, { scaleY: 0, transformOrigin: 'top center' });

      st = ScrollTrigger.create({
        trigger: parent,
        start: 'top 75%',
        end: 'bottom 25%',
        scrub: 1,
        animation: gsap
          .timeline()
          .to(el, { scaleY: 1, ease: CINEMATIC.line, duration: 0.5 })
          .to(el, { scaleY: 0, ease: CINEMATIC.line, duration: 0.5 }),
      });
    };

    animate();
    return () => {
      cleanup = true;
      if (st) st.kill();
    };
  }, []);

  return (
    <div
      ref={lineRef}
      aria-hidden="true"
      className="hidden lg:block"
      style={{
        position: 'absolute',
        right: '2rem',
        top: '10%',
        bottom: '10%',
        width: '1px',
        background: '#E8272A',
        zIndex: 1,
        pointerEvents: 'none',
        opacity: 0.6,
        willChange: 'transform',
      }}
    />
  );
}
