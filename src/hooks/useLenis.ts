'use client';

import { useEffect } from 'react';

export function useLenis() {
  useEffect(() => {
    const init = async () => {
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      const { default: gsap } = await import('gsap');
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.refresh();
    };
    init();
  }, []);
}
