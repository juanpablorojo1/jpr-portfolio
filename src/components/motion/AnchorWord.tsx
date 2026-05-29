'use client';

import { useEffect, useRef } from 'react';
import { TRANSITION_CONFIG, CINEMATIC, type SectionId } from '../../lib/transitionConfig';

interface Props {
  sectionId: Exclude<SectionId, 'hero'>;
}

export default function AnchorWord({ sectionId }: Props) {
  const wordRef = useRef<HTMLDivElement>(null);
  const config = TRANSITION_CONFIG[sectionId];

  useEffect(() => {
    let cleanup = false;
    let st: any;
    let st2: any;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animate = async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      if (cleanup || !wordRef.current) return;

      const el = wordRef.current;
      const parent = el.parentElement;
      if (!parent) return;

      if (reduced) {
        gsap.set(el, { opacity: config.opacity, scale: 1, x: 0 });
        return;
      }

      // Initial state — word is offscreen-right with scale boost
      gsap.set(el, { opacity: 0, scale: 1.15, xPercent: 30 });

      // Reveal as section enters viewport — scrubbed so user controls timing
      st = ScrollTrigger.create({
        trigger: parent,
        start: 'top 90%',
        end: 'top 30%',
        scrub: 1.2,
        animation: gsap.fromTo(
          el,
          { opacity: 0, scale: 1.15, xPercent: 30 },
          { opacity: config.opacity, scale: 1, xPercent: 0, ease: CINEMATIC.reveal }
        ),
      });

      // Dismiss as section gets covered by next card
      st2 = ScrollTrigger.create({
        trigger: parent,
        start: 'bottom 80%',
        end: 'bottom 20%',
        scrub: 1,
        animation: gsap.to(el, {
          opacity: 0,
          scale: 0.92,
          xPercent: -15,
          ease: CINEMATIC.dismiss,
        }),
      });
    };

    animate();
    return () => {
      cleanup = true;
      if (st) st.kill();
      if (st2) st2.kill();
    };
  }, [config]);

  return (
    <div
      ref={wordRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: `${config.yPercent}%`,
        left: '50%',
        transform: 'translate(-50%, -50%)',
        fontFamily: 'var(--font-bebas-neue), sans-serif',
        fontSize: config.fontSize,
        color: '#FFFFFF',
        letterSpacing: '0.08em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0,
        willChange: 'transform, opacity',
        mixBlendMode: 'screen',
      }}
    >
      {config.word}
    </div>
  );
}
