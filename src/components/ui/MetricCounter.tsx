'use client';

import { useEffect, useRef, useState } from 'react';

interface MetricCounterProps {
  value: number;
  decimals?: number;
  suffix?: string;
  label: string;
  duration?: number;
}

export default function MetricCounter({
  value,
  decimals = 2,
  suffix = '',
  label,
  duration = 1.5,
}: MetricCounterProps) {
  const [current, setCurrent] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true);
            animateCounter();
          }
        });
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasAnimated, value]);

  const animateCounter = () => {
    const startTime = performance.now();
    const durationMs = duration * 1000;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // power2 ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * value);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setCurrent(value);
      }
    };

    requestAnimationFrame(tick);
  };

  const displayValue = current.toFixed(decimals);

  return (
    <div ref={ref} className="flex flex-col items-start gap-1">
      <span
        className="font-mono text-accent font-normal leading-none"
        style={{
          fontSize: 'clamp(2rem, 4vw, 3rem)',
          letterSpacing: '-0.02em',
          textShadow: hasAnimated ? '0 0 20px rgba(232, 39, 42, 0.30)' : 'none',
          transition: 'text-shadow 0.5s ease',
        }}
      >
        {displayValue}
        {suffix}
      </span>
      <span className="font-mono text-xs text-muted uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}
