'use client';

interface StackBadgeProps {
  label: string;
  className?: string;
}

export default function StackBadge({ label, className = '' }: StackBadgeProps) {
  return (
    <span
      className={`
        inline-block font-mono text-xs text-off-white
        bg-surface-alt border border-border
        px-2 py-0.5 rounded-xs
        tracking-widest uppercase
        transition-colors duration-150
        hover:border-accent hover:text-accent
        ${className}
      `}
    >
      {label}
    </span>
  );
}
