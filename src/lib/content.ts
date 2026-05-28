// Static content data (images, links, etc. — strings come from i18n messages)

export const SOCIAL_LINKS = {
  email: 'juan.pablo.rojo@mi.unc.edu.ar',
  linkedin: 'https://linkedin.com/in/juan-pablo-rojo',
  github: 'https://github.com/juanpablorojo',
} as const;

export const TRAUMAVISION_METRICS = [
  { key: 'auc', value: 0.973, decimals: 3, suffix: '' },
  { key: 'accuracy', value: 97.18, decimals: 2, suffix: '%' },
  { key: 'sensitivity', value: 90.85, decimals: 2, suffix: '%' },
  { key: 'f1', value: 92.36, decimals: 2, suffix: '%' },
] as const;

export const TRAUMAVISION_STACK = [
  'Python', 'PyTorch', 'DenseNet', 'YOLOv8', 'Grad-CAM', 'FastAPI', 'SQLite',
] as const;

export const TRAUMAVISION_SCREENSHOTS = [
  {
    src: '/images/traumavision-login.jpg',
    alt: 'TraumaVision — Login screen',
  },
  {
    src: '/images/traumavision-home.jpg',
    alt: 'TraumaVision — Upload UI with anatomical region selector',
  },
  {
    src: '/images/traumavision-analisis.jpg',
    alt: 'TraumaVision — Fracture detection with bounding box, 84% probability',
  },
  {
    src: '/images/traumavision-historial.jpg',
    alt: 'TraumaVision — Analysis history with 48 records',
  },
  {
    src: '/images/traumavision-dashboard.jpg',
    alt: 'TraumaVision — Statistical dashboard',
  },
] as const;

export const ELEVEN_STACK = ['Next.js', 'Claude API', 'Supabase', 'GSAP'] as const;

export const HACKATHON_STACK = ['Team: Algarroba LID', 'RTS Group', '2025'] as const;
