'use client';

import { useEffect, useRef } from 'react';

// ECG path — 6 cardiac cycles, each 200px wide, viewBox width = 1200
// Baseline y=24 (center of 48px height)
// One cycle: baseline → P-wave → PR segment → QRS complex → ST segment → T-wave → TP baseline
const buildEcgPath = (): string => {
  // Single cycle template (x offsets, y=24 is baseline center)
  // Each cycle is 200px wide
  const cycle = (ox: number): string =>
    `L${ox + 20},24` +                          // baseline pre-P
    `Q${ox + 27},19 ${ox + 34},24` +             // P-wave (smooth bump up)
    `L${ox + 50},24` +                           // PR segment
    `L${ox + 60},28` +                           // Q (small dip down)
    `L${ox + 68},6` +                            // R peak (tall spike up — y=6)
    `L${ox + 76},28` +                           // S (dip down)
    `L${ox + 82},24` +                           // return to baseline
    `L${ox + 100},26` +                          // ST segment (slightly elevated)
    `Q${ox + 115},32 ${ox + 130},24` +           // T-wave (smooth bump down)
    `L${ox + 200},24`;                           // TP baseline to next cycle

  return [
    'M0,24',
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

  useEffect(() => {
    const path = pathRef.current;
    const container = containerRef.current;
    if (!path || !container) return;

    // Calculate total path length for stroke-dasharray animation
    const totalLength = path.getTotalLength();

    // Initial state: path fully hidden (dashoffset = totalLength)
    path.style.strokeDasharray = `${totalLength}`;
    path.style.strokeDashoffset = `${totalLength}`;

    let rafId: number | null = null;

    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;

      // Draw path left-to-right: dashoffset goes from totalLength → 0
      path.style.strokeDashoffset = `${totalLength * (1 - progress)}`;

      // Fade in as soon as user scrolls
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
        left: 0,
        right: 0,
        height: '48px',
        zIndex: 200,
        pointerEvents: 'none',
        opacity: 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <svg
        width="100%"
        height="48"
        viewBox="0 0 1200 48"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
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
