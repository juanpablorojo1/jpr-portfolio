// Anchor words baked into each section as opacity-0.04 watermarks.
// Drives the cinematic transition between card-stack sections.

export type SectionId =
  | 'hero'
  | 'about'
  | 'projects'
  | 'skills'
  | 'experience'
  | 'contact';

export interface AnchorConfig {
  word: string;
  opacity: number;
  yPercent: number;
  fontSize: string;
}

export const TRANSITION_CONFIG: Record<Exclude<SectionId, 'hero'>, AnchorConfig> = {
  about:      { word: 'BIOLOGY',   opacity: 0.045, yPercent: 50, fontSize: 'clamp(8rem, 22vw, 22rem)' },
  projects:   { word: 'BUILT',     opacity: 0.05,  yPercent: 45, fontSize: 'clamp(8rem, 24vw, 24rem)' },
  skills:     { word: 'PRECISION', opacity: 0.04,  yPercent: 55, fontSize: 'clamp(6rem, 16vw, 18rem)' },
  experience: { word: 'DEPLOYED',  opacity: 0.045, yPercent: 50, fontSize: 'clamp(7rem, 18vw, 20rem)' },
  contact:    { word: 'TOGETHER',  opacity: 0.05,  yPercent: 45, fontSize: 'clamp(7rem, 18vw, 20rem)' },
};

export const CINEMATIC = {
  reveal:  'power4.out',
  hold:    'none',
  dismiss: 'power2.inOut',
  line:    'expo.inOut',
} as const;
