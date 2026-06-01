'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const symbolRef = useRef<HTMLDivElement>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const progress = progressRef.current;
    const symbol = symbolRef.current;
    if (!container || !progress || !symbol) return;

    // Ensure onComplete is only called once
    const complete = () => {
      if (calledRef.current) return;
      calledRef.current = true;
      onComplete();
    };

    // Absolute fallback — always fires at 2.8s no matter what
    const fallback = setTimeout(complete, 2800);

    const run = async () => {
      try {
        const { default: gsap } = await import('gsap');

        const tl = gsap.timeline();

        // Symbol fade in
        tl.fromTo(
          symbol,
          { opacity: 0, scale: 0.9 },
          { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }
        );

        // Progress bar fills left to right
        tl.fromTo(
          progress,
          { scaleX: 0 },
          { scaleX: 1, duration: 1.2, ease: 'power2.inOut', transformOrigin: 'left center' },
          0.3
        );

        // Slide entire screen upward — reveal site
        tl.to(
          container,
          {
            y: '-100%',
            duration: 0.6,
            ease: 'expo.inOut',
            onComplete: complete,
          },
          1.6
        );
      } catch {
        // GSAP failed — fire complete after CSS transition
        container.style.transition = 'transform 0.6s ease';
        container.style.transform = 'translateY(-100%)';
        setTimeout(complete, 700);
      }
    };

    run();

    return () => {
      clearTimeout(fallback);
    };
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-bg"
      aria-label="Loading"
    >
      {/* Logo symbol */}
      <div ref={symbolRef} style={{ opacity: 0 }} className="flex flex-col items-center gap-6">
        <Image
          src="/logos/logo-symbol.svg"
          alt="JPR"
          width={80}
          height={80}
          priority
          className="w-20 h-20"
        />
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-border overflow-hidden">
        <div
          ref={progressRef}
          className="h-full bg-accent"
          style={{ transform: 'scaleX(0)', transformOrigin: 'left center' }}
        />
      </div>
    </div>
  );
}
