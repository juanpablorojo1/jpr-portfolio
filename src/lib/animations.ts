// GSAP animation configs — reusable across components
export const EASINGS = {
  expo: 'expo.out',
  power2: 'power2.out',
  power3: 'power3.inOut',
  elastic: 'elastic.out(1, 0.3)',
} as const;

export const DURATIONS = {
  fast: 0.2,
  normal: 0.4,
  slow: 0.8,
  verySlow: 1.2,
} as const;

export const STAGGER = {
  letters: 0.03,
  items: 0.08,
  cards: 0.12,
} as const;

export const SCROLL_TRIGGER_DEFAULTS = {
  start: 'top 80%',
  end: 'bottom 20%',
} as const;

// Clip path reveal animation config
export const clipReveal = {
  from: { clipPath: 'inset(100% 0 0 0)', opacity: 0 },
  to: { clipPath: 'inset(0% 0 0 0)', opacity: 1, duration: 0.8, ease: EASINGS.expo },
};

// Fade up animation config
export const fadeUp = {
  from: { opacity: 0, y: 30 },
  to: { opacity: 1, y: 0, duration: 0.6, ease: EASINGS.power2 },
};
