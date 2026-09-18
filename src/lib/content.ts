// Static content data (images, links, etc. — strings come from i18n messages)

export const SOCIAL_LINKS = {
  email: 'juanpablorojo1@gmail.com',
  emailAlt: 'juan.pablo.rojo@mi.unc.edu.ar',
  linkedin: 'https://linkedin.com/in/juan-pablo-rojo',
  github: 'https://github.com/juanpablorojo1',
  instagram: 'https://www.instagram.com/juampi_rojo/',
  phone: '+54 385 514 3413',
  whatsapp: 'https://wa.me/543855143413',
} as const;

export const TRAUMAVISION_METRICS = [
  { key: 'auc', value: 0.973, decimals: 3, suffix: '' },
  { key: 'map50', value: 91.9, decimals: 1, suffix: '%' },
  { key: 'recall', value: 86.6, decimals: 1, suffix: '%' },
  { key: 'f1', value: 92.36, decimals: 2, suffix: '%' },
] as const;

export const TRAUMAVISION_STACK = [
  'Python', 'PyTorch', 'YOLOv8m', 'Ultralytics', 'FastAPI', 'Uvicorn',
  'OpenCV', 'NumPy', 'Pillow', 'PyDICOM', 'React', 'TypeScript', 'Vite',
  'VS Code', 'GitHub Copilot',
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

export const ELEVEN_STACK = [
  'Next.js', 'TypeScript', 'Tailwind CSS', 'Supabase', 'GSAP', 'Vercel', 'GitHub',
  'Claude Sonnet · Haiku · Opus', 'Prompt Caching', 'Extended Thinking',
  'Tool Use · Function Calling', 'Multi-agent Pipeline', 'Claude Code CLI',
  'Playwright MCP', 'Google Drive MCP', 'Gmail MCP', 'Google Calendar MCP',
  'Canva MCP', 'Vercel MCP', 'next-intl', 'Resend', 'VS Code', 'GitHub Copilot',
] as const;

export const ELEVEN_SCREENSHOTS = [
  { src: '/images/eleven-01-hero.jpg', alt: 'Eleven — Hero con logo y mascota robot', label: 'HERO' },
  { src: '/images/eleven-02-servicios.jpg', alt: 'Eleven — Sección por qué nosotros', label: '¿POR QUÉ?' },
  { src: '/images/eleven-03-servicios2.jpg', alt: 'Eleven — Lo que hacemos, transición', label: 'SERVICIOS' },
  { src: '/images/eleven-04-servicios3.jpg', alt: 'Eleven — Páginas web y productos digitales', label: 'WEB' },
  { src: '/images/eleven-05-portfolio.jpg', alt: 'Eleven — Contenido y videos', label: 'CONTENIDO' },
  { src: '/images/eleven-06-contacto.jpg', alt: 'Eleven — Sección contacto y footer', label: 'CONTACTO' },
] as const;

export const KIBBO_STACK = [
  'Next.js', 'TypeScript', 'Tailwind CSS', 'SSR · SSG',
  'GSAP', 'ScrollSmoother', 'ScrollTrigger', 'gsap.matchMedia',
  'Scrollytelling', 'Mask Reveals', 'View Transitions', 'Custom Cursor',
  'Brand Preloader', 'next/font · Montserrat · Inter', 'WebP Assets',
  'AWS Amplify', 'Vercel', 'Playwright MCP', 'Claude in Chrome', 'Lighthouse 93+',
] as const;

export const KIBBO_SCREENSHOTS = [
  { src: '/images/kibbo-01-hero.jpg', alt: 'KIBBO — Hero con wordmark de marca y red de constelaciones', label: 'HERO' },
  { src: '/images/kibbo-02-quees.jpg', alt: 'KIBBO — Qué es KIBBO, mockup de laptop con la marca', label: '¿QUÉ ES?' },
  { src: '/images/kibbo-03-inventario.jpg', alt: 'KIBBO — Inventario del parque: serial, QR, servicio y estado', label: 'INVENTARIO' },
  { src: '/images/kibbo-04-dashboard.jpg', alt: 'KIBBO — Dashboard de operatividad en laptop y app móvil', label: 'DASHBOARD' },
  { src: '/images/kibbo-05-resenas.jpg', alt: 'KIBBO — Opiniones de usuarios de bioingeniería hospitalaria', label: 'RESEÑAS' },
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
