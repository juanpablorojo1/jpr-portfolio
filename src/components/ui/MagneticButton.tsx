'use client';

import { useRef, useCallback } from 'react';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  as?: 'button' | 'a';
  target?: string;
  rel?: string;
}

export default function MagneticButton({
  children,
  className = '',
  onClick,
  href,
  as: Tag = 'button',
  target,
  rel,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement & HTMLAnchorElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Only on pointer: fine (desktop)
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
    el.style.transform = 'translate(0, 0)';
    setTimeout(() => {
      if (el) el.style.transition = '';
    }, 500);
  }, []);

  const handleMouseEnter = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'transform 0.3s ease-out';
  }, []);

  const props = {
    ref,
    className,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    onMouseEnter: handleMouseEnter,
    onClick,
    ...(Tag === 'a' && { href, target, rel }),
  };

  return <Tag {...(props as any)}>{children}</Tag>;
}
