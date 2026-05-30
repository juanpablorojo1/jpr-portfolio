'use client';

interface StackBadgeProps {
  label: string;
  className?: string;
}

export default function StackBadge({ label, className = '' }: StackBadgeProps) {
  // If className provides overrides, let them take effect via Tailwind merge order
  const hasOverride = className.length > 0;
  return (
    <span
      className={
        hasOverride
          ? `inline-block font-mono text-off-white bg-surface-alt border border-border rounded-xs uppercase transition-colors duration-150 hover:border-accent hover:text-accent ${className}`
          : `inline-block font-mono text-xs text-off-white bg-surface-alt border border-border px-2 py-0.5 rounded-xs tracking-widest uppercase transition-colors duration-150 hover:border-accent hover:text-accent`
      }
    >
      {label}
    </span>
  );
}
