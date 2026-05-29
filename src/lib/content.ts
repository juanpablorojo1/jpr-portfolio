// Static content data (images, links, etc. — strings come from i18n messages)

export const SOCIAL_LINKS = {
  email: 'juan.pablo.rojo@mi.unc.edu.ar',
  linkedin: 'https://linkedin.com/in/juan-pablo-rojo',
  github: 'https://github.com/juanpablorojo',
} as const;

export const TRAUMAVISION_METRICS = [
  { key: 'auc', value: 0.973, decimals: 3, suffix: '' },
  { key: 'map50', value: 91.9, decimals: 1, suffix: '%' },
  { key: 'recall', value: 86.6, decimals: 1, suffix: '%' },
  { key: 'f1', value: 92.36, decimals: 2, suffix: '%' },
] as const;

export const TRAUMAVISION_STACK = [
  'Python', 'PyTorch', 'YOLOv8', 'FastAPI', 'SQLite',
] as const;

export const TRAUMAVISION_SCREENSHOTS = [
  {
    src: '/images/traumavision-login.jpg',
    alt: 'TraumaVision — Login screen',
    label: 'LOGIN',
  },
  {
    src: '/images/traumavision-home.jpg',
    alt: 'TraumaVision — Upload UI with anatomical region selector',
    label: 'HOME',
  },
  {
    src: '/images/traumavision-analisis.jpg',
    alt: 'TraumaVision — Fracture detection with bounding box, 84% probability',
    label: 'ANALISIS',
  },
  {
    src: '/images/traumavision-historial.jpg',
    alt: 'TraumaVision — Analysis history with 48 records',
    label: 'HISTORIAL',
  },
  {
    src: '/images/traumavision-dashboard.jpg',
    alt: 'TraumaVision — Statistical dashboard',
    label: 'DASHBOARD',
  },
  {
    src: '/images/traumavision-metrics.jpg',
    alt: 'TraumaVision — Confusion matrix and performance metrics (YOLOv8m, test set 3,035 X-rays)',
    label: 'MÉTRICAS',
  },
] as const;

export const ELEVEN_STACK = ['Next.js', 'Claude API', 'Supabase', 'GSAP', 'Vercel', 'Tailwind'] as const;

export const ELEVEN_SCREENSHOTS = [
  { src: '/images/eleven-01-hero.jpg', alt: 'Eleven — Hero con logo y mascota robot', label: 'HERO' },
  { src: '/images/eleven-02-servicios.jpg', alt: 'Eleven — Sección por qué nosotros', label: '¿POR QUÉ?' },
  { src: '/images/eleven-03-servicios2.jpg', alt: 'Eleven — Lo que hacemos, transición', label: 'SERVICIOS' },
  { src: '/images/eleven-04-servicios3.jpg', alt: 'Eleven — Páginas web y productos digitales', label: 'WEB' },
  { src: '/images/eleven-05-portfolio.jpg', alt: 'Eleven — Contenido y videos', label: 'CONTENIDO' },
  { src: '/images/eleven-06-contacto.jpg', alt: 'Eleven — Sección contacto y footer', label: 'CONTACTO' },
] as const;

export const HACKATHON_STACK = ['Team: Algarroba LID', 'RTS Group', '2025'] as const;

export const HACKATHON_PHOTOS = [
  { src: '/images/hackathon-01.jpg', alt: 'Rocking the Industry 2025 — Event' },
  { src: '/images/hackathon-02.jpg', alt: 'Rocking the Industry 2025 — Team' },
  { src: '/images/hackathon-03.jpg', alt: 'Rocking the Industry 2025 — Presentation' },
  { src: '/images/hackathon-04.jpg', alt: 'Rocking the Industry 2025 — Stage' },
  { src: '/images/hackathon-05.jpg', alt: 'Rocking the Industry 2025 — Award' },
  { src: '/images/hackathon-06.jpg', alt: 'Rocking the Industry 2025 — Team celebration' },
] as const;
