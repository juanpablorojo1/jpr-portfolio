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

// ── Case studies (KIBBO, LEEX) ──
// Screenshots: src here; label + caption (also used as alt) live in
// messages/<locale>.json under projects.<case>.shots[i], same order.

export const KIBBO_URL = 'https://kibbo.io/en';

export const KIBBO_STACK = [
  'Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS v4', 'GSAP',
  'JSON-LD', 'GA4', 'AWS Amplify', 'Claude Code',
] as const;

export const KIBBO_SCREENSHOTS = [
  '/images/kibbo-en-01-hero.jpg',
  '/images/kibbo-en-02-problems.jpg',
  '/images/kibbo-en-03-on-the-floor.jpg',
  '/images/kibbo-en-04-dashboard.jpg',
  '/images/kibbo-en-05-community.jpg',
  '/images/kibbo-en-06-trust.jpg',
  '/images/kibbo-en-07-resource.jpg',
  '/images/kibbo-en-08-mobile.jpg',
] as const;

// SEO / GEO evidence — label + caption in projects.kibbo.seo_shots[i]
export const KIBBO_SEO_SCREENSHOTS = [
  '/images/kibbo-seo-schema.jpg',
  '/images/kibbo-seo-hreflang.jpg',
] as const;

export const LEEX_STACK = [
  'Python 3.12', 'Next.js 16', 'React 19', 'TypeScript',
  'Supabase (PostgreSQL + RLS)', 'pgvector', 'Claude (Haiku · Sonnet)',
  'pdfplumber + OCR', 'pytest', 'Vitest', 'GitHub Actions', 'Vercel',
] as const;

// Opens with the verdict (the product's core); the detection shot, which shows the
// "incomplete sweep" warning, sits 3rd with a caption that frames it as a decision.
export const LEEX_SCREENSHOTS = [
  '/images/leex-02-veredicto.jpg',
  '/images/leex-03-mi-trabajo.jpg',
  '/images/leex-01-deteccion.jpg',
  '/images/leex-04-tablero.jpg',
  '/images/leex-05-fuentes.jpg',
] as const;

// ── Motion & Video ──
// Add a piece = add an entry here + messages videos.items.<id> {eyebrow, title, caption}.
// orientation drives the card layout (portrait 9:16 cards, landscape spans a full row).
export type VideoOrientation = 'portrait' | 'landscape';

export interface VideoItem {
  id: string;
  src: string;
  poster: string;
  orientation: VideoOrientation;
  width: number;
  height: number;
  duration: string; // m:ss, shown on the card
  audioLang: 'es' | 'en' | 'none';
  /** License link for third-party material credited in messages videos.items.<id>.credit */
  creditHref?: string;
}

// Link required by the CC BY 4.0 attribution of the archive engravings in the B6 reel
export const CC_BY_4_URL = 'https://creativecommons.org/licenses/by/4.0/';

export const VIDEOS: readonly VideoItem[] = [
  { id: 'b6_story', src: '/videos/b6-story.mp4', poster: '/videos/b6-story-poster.jpg', orientation: 'portrait', width: 1080, height: 1920, duration: '0:46', audioLang: 'es', creditHref: CC_BY_4_URL },
  { id: 'kibbo_film', src: '/videos/kibbo-film.mp4', poster: '/videos/kibbo-film-poster.jpg', orientation: 'portrait', width: 1080, height: 1920, duration: '0:46', audioLang: 'es' },
  { id: 'v8v_cpr', src: '/videos/v8v-rcp.mp4', poster: '/videos/v8v-rcp-poster.jpg', orientation: 'portrait', width: 1080, height: 1920, duration: '0:18', audioLang: 'es' },
  { id: 'mri_explainer', src: '/videos/mri-explainer.mp4', poster: '/videos/mri-explainer-poster.jpg', orientation: 'portrait', width: 1080, height: 1920, duration: '1:00', audioLang: 'es' },
  { id: 'model_comparison', src: '/videos/model-comparison.mp4', poster: '/videos/model-comparison-poster.jpg', orientation: 'landscape', width: 1920, height: 1080, duration: '0:10', audioLang: 'none' },
] as const;

// Desktop Projects rail: width of each panel in viewport units (1 = 100vw of rail
// = 100vh of scroll). Case studies with two spreads take 2. Order = panel order.
export const PROJECT_PANEL_WIDTHS = [1, 1, 1, 2, 2] as const;

export const HACKATHON_STACK = ['Team: Algarroba LID', 'RTS Group', '2025'] as const;

export const HACKATHON_PHOTOS = [
  { src: '/images/hackathon-01.jpg', alt: 'Rocking the Industry 2025 — Event' },
  { src: '/images/hackathon-02.jpg', alt: 'Rocking the Industry 2025 — Team' },
  { src: '/images/hackathon-03.jpg', alt: 'Rocking the Industry 2025 — Presentation' },
  { src: '/images/hackathon-04.jpg', alt: 'Rocking the Industry 2025 — Stage' },
  { src: '/images/hackathon-05.jpg', alt: 'Rocking the Industry 2025 — Award' },
  { src: '/images/hackathon-06.jpg', alt: 'Rocking the Industry 2025 — Team celebration' },
] as const;
