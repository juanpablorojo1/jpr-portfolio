'use client';

import { useEffect } from 'react';

export function useLenis() {
  useEffect(() => {
    let lenis: InstanceType<typeof import('@studio-freight/lenis').default> | null = null;
    let rafId: number = 0;

    const init = async () => {
      try {
        const LenisModule = await import('@studio-freight/lenis');
        const Lenis = LenisModule.default;
        const { ScrollTrigger } = await import('gsap/ScrollTrigger');
        const { default: gsap } = await import('gsap');
        gsap.registerPlugin(ScrollTrigger);

        lenis = new Lenis({
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
        });

        // Integrate Lenis with GSAP ScrollTrigger
        lenis.on('scroll', ScrollTrigger.update);

        gsap.ticker.add((time) => {
          lenis?.raf(time * 1000);
        });

        gsap.ticker.lagSmoothing(0);
      } catch (error) {
        console.warn('Lenis initialization failed:', error);
      }
    };

    init();

    return () => {
      lenis?.destroy();
      cancelAnimationFrame(rafId);
    };
  }, []);
}
