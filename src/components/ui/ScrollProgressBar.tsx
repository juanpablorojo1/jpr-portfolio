'use client';

import { useEffect, useRef } from 'react';

// ECG path — vertical orientation, top-to-bottom
// viewBox: 48w × 1200h; baseline x=24 (center); deflects left/right
// 6 cardiac cycles, each 200px tall
const buildEcgPath = (): string => {
  // Single cycle: 200px tall, baseline x=24
  // P-wave: gentle rightward curve
  // QRS: Q dip left → dramatic R spike right → S dip left
  // T-wave: smooth rightward hump
  // ST: slightly elevated before T
  const cycle = (oy: number): string =>
    `L24,${oy + 22}` +                              // baseline pre-P
    `Q30,${oy + 28} 24,${oy + 36}` +               // P-wave (gentle right bump)
    `L24,${oy + 52}` +                              // PR segment
    `L18,${oy + 61}` +                              // Q (left dip)
    `L42,${oy + 70}` +                              // R peak (dramatic right spike)
    `L10,${oy + 79}` +                              // S (deep left dip)
    `L24,${oy + 86}` +                              // return baseline
    `L25,${oy + 104}` +                             // ST segment
    `Q32,${oy + 118} 24,${oy + 135}` +             // T-wave (smooth right hump)
    `L24,${oy + 200}`;                              // TP baseline

  return [
    'M24,0',
    cycle(0),
    cycle(200),
    cycle(400),
    cycle(600),
    cycle(800),
    cycle(1000),
  ].join(' ');
};

const ECG_PATH = buildEcgPath();

export default function ScrollProgressBar() {
  const pathRef = useRef<SVGPathElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    const glow = glowRef.current;
    const container = containerRef.current;
    if (!path || !container) return;

    const totalLength = path.getTotalLength();

    path.style.strokeDasharray = `${totalLength}`;
    path.style.strokeDashoffset = `${totalLength}`;
    if (glow) {
      glow.style.strokeDasharray = `${totalLength}`;
      glow.style.strokeDashoffset = `${totalLength}`;
    }

    let rafId: number | null = null;

    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;

      const offset = `${totalLength * (1 - progress)}`;
      path.style.strokeDashoffset = offset;
      if (glow) glow.style.strokeDashoffset = offset;

      container.style.opacity = progress > 0.005 ? '1' : '0';
      rafId = null;
    };

    const onScroll = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(updateProgress);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    updateProgress();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '36px',
        zIndex: 200,
        pointerEvents: 'none',
        opacity: 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <svg
        width="36"
        height="100%"
        viewBox="0 0 48 1200"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <filter id="ecg-glow" x="-100%" y="-10%" width="300%" height="120%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Glow layer */}
        <path
          ref={glowRef}
          d={ECG_PATH}
          stroke="#E8272A"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.25"
          filter="url(#ecg-glow)"
        />

        {/* Main line */}
        <path
          ref={pathRef}
          d={ECG_PATH}
          stroke="#E8272A"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
