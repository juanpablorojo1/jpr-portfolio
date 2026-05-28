'use client';

import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only on pointer: fine (desktop)
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // Show cursors
    dot.style.opacity = '1';
    ring.style.opacity = '1';

    let mouseX = 0;
    let mouseY = 0;
    let ringX = 0;
    let ringY = 0;
    let rafId: number;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX - 4}px, ${mouseY - 4}px)`;
    };

    const animate = () => {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.transform = `translate(${ringX - 16}px, ${ringY - 16}px)`;
      rafId = requestAnimationFrame(animate);
    };

    animate();

    // Hover states on interactive elements
    const onEnter = () => {
      ring.style.width = '40px';
      ring.style.height = '40px';
      ring.style.borderColor = '#E8272A';
      ring.style.marginLeft = '-20px';
      ring.style.marginTop = '-20px';
    };

    const onLeave = () => {
      ring.style.width = '32px';
      ring.style.height = '32px';
      ring.style.borderColor = 'rgba(255,255,255,0.4)';
      ring.style.marginLeft = '0px';
      ring.style.marginTop = '0px';
    };

    const interactives = document.querySelectorAll('a, button, [role="button"]');
    interactives.forEach((el) => {
      el.addEventListener('mouseenter', onEnter);
      el.addEventListener('mouseleave', onLeave);
    });

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(rafId);
      interactives.forEach((el) => {
        el.removeEventListener('mouseenter', onEnter);
        el.removeEventListener('mouseleave', onLeave);
      });
    };
  }, []);

  return (
    <>
      {/* Dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-2 h-2 bg-white rounded-full pointer-events-none z-[9999] opacity-0"
        style={{
          mixBlendMode: 'difference',
          transition: 'transform 0ms linear',
        }}
      />
      {/* Ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] opacity-0"
        style={{
          width: '32px',
          height: '32px',
          border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: '50%',
          transition: 'width 0.2s ease, height 0.2s ease, border-color 0.2s ease',
        }}
      />
    </>
  );
}
