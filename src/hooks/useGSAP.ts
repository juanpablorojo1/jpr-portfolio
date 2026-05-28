'use client';

import { useEffect, useRef } from 'react';

type GSAPCallback = (gsap: typeof import('gsap').default) => void | (() => void);

export function useGSAP(callback: GSAPCallback, deps: React.DependencyList = []) {
  const cleanupRef = useRef<(() => void) | void>(undefined);

  useEffect(() => {
    let gsapModule: typeof import('gsap').default;

    const init = async () => {
      const { default: gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      gsap.registerPlugin(ScrollTrigger);
      gsapModule = gsap;
      cleanupRef.current = callback(gsap) ?? undefined;
    };

    init();

    return () => {
      if (typeof cleanupRef.current === 'function') {
        cleanupRef.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
