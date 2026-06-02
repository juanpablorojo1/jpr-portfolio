'use client';

import { useEffect, useRef } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

// ECG path: flat baseline → P wave → QRS complex (tall R peak) → T wave → flat baseline
// ViewBox 0 0 400 120, baseline at y=60
const ECG_PATH =
  'M0,60 L60,60 L70,55 L80,60 L90,58 L100,62 L108,10 L116,100 L122,58 L132,62 L145,55 L155,60 L340,60';

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ecgPathRef = useRef<SVGPathElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const ecgEl = ecgPathRef.current;
    const progress = progressRef.current;
    if (!container || !ecgEl || !progress) return;

    const complete = () => {
      if (calledRef.current) return;
      calledRef.current = true;
      onComplete();
    };

    // Absolute fallback
    const fallback = setTimeout(complete, 2800);

    // prefers-reduced-motion: show ECG fully drawn, complete fast
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      // Show full ECG static, no animation — complete quickly
      ecgEl.style.strokeDasharray = 'none';
      ecgEl.style.strokeDashoffset = '0';
      if (progress) {
        progress.style.transform = 'scaleX(1)';
        progress.style.transition = 'none';
      }
      setTimeout(complete, 400);
      return () => clearTimeout(fallback);
    }

    // Measure path length for dash animation
    const pathLength = ecgEl.getTotalLength();
    ecgEl.style.strokeDasharray = String(pathLength);
    ecgEl.style.strokeDashoffset = String(pathLength);

    const run = async () => {
      try {
        const { default: gsap } = await import('gsap');

        const tl = gsap.timeline();

        // 1. Draw the ECG trace from left to right (0 → pathLength drawn)
        tl.to(
          ecgEl,
          {
            strokeDashoffset: 0,
            duration: 1.4,
            ease: 'power2.inOut',
          },
          0
        );

        // 2. Progress bar fills in sync
        tl.fromTo(
          progress,
          { scaleX: 0 },
          { scaleX: 1, duration: 1.2, ease: 'power2.inOut', transformOrigin: 'left center' },
          0.2
        );

        // 3. Slight glow pulse on the ECG after draw completes
        tl.to(
          ecgEl,
          {
            filter: 'drop-shadow(0 0 6px #E8272A)',
            duration: 0.2,
            ease: 'power2.out',
          },
          1.3
        );

        // 4. Slide entire screen upward — reveal site
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
        // GSAP failed — CSS fallback
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
      {/* ECG cardiogram — hero narrativo del loader */}
      <div className="w-full max-w-sm px-8 sm:max-w-md">
        <svg
          viewBox="0 0 400 120"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          aria-hidden="true"
        >
          {/* Faint baseline grid line */}
          <line
            x1="0"
            y1="60"
            x2="400"
            y2="60"
            stroke="#2a2a2a"
            strokeWidth="1"
          />
          {/* ECG trace */}
          <path
            ref={ecgPathRef}
            d={ECG_PATH}
            stroke="#E8272A"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
