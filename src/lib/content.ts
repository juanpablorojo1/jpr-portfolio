// Static content data (images, links, etc. — strings come from i18n messages)

export const SOCIAL_LINKS = {
  email: 'juanpablorojo1@gmail.com',
  emailAlt: 'juan.pablo.rojo@mi.unc.edu.ar',
  linkedin: 'https://www.linkedin.com/in/juan-pablo-rojo-83b843243',
  github: 'https://github.com/juanpablorojo1',
  instagram: 'https://www.instagram.com/juampi_rojo/',
  phone: '+54 385 514 3413',
  whatsapp: 'https://wa.me/543855143413',
} as const;

export const TRAUMAVISION_METRICS = [
  { key: 'auc', value: 0.987, decimals: 3, suffix: '' },
  { key: 'map50', value: 0.944, decimals: 3, suffix: '' },
  { key: 'recall', value: 96.7, decimals: 1, suffix: '%' },
  { key: 'specificity', value: 93.1, decimals: 1, suffix: '%' },
] as const;

export const TRAUMAVISION_STACK = [
  'Python', 'PyTorch', 'YOLOv8m', 'Ultralytics', 'FastAPI', 'Uvicorn',
  'OpenCV', 'NumPy', 'Pillow', 'PyDICOM', 'SQLAlchemy', 'Jinja2', 'ReportLab',
  'Chart.js', 'GSAP', 'pytest',
] as const;

// label + alt in messages projects.traumavision.shot_labels[i] / shots_alt[i], same order
// Track C (2026-10-10): public/projects/<proyecto>/. Donde había versión difuminada en _work/ se usa esa.
export const TRAUMAVISION_SCREENSHOTS = [
  { src: '/projects/traumavision/tv-01-resultado-revisar.jpg' },
  { src: '/projects/traumavision/tv-02-visor-contraste.jpg' },
  { src: '/projects/traumavision/tv-03-sin-hallazgos.jpg' },
  { src: '/projects/traumavision/tv-04-historial.jpg' },
  { src: '/projects/traumavision/tv-05-metricas-acierto.jpg' },
] as const;

export const ELEVEN_STACK = [
  'Next.js', 'TypeScript', 'Tailwind CSS', 'Supabase', 'GSAP', 'Vercel', 'GitHub',
  'Claude API', 'Prompt Caching', 'Extended Thinking',
  'Tool Use · Function Calling', 'Multi-agent Pipeline', 'Claude Code CLI',
  'Playwright MCP', 'Google Drive MCP', 'Gmail MCP', 'Google Calendar MCP',
  'Canva MCP', 'Vercel MCP', 'next-intl', 'Resend', 'VS Code', 'GitHub Copilot',
] as const;

export const ELEVEN_URL = 'https://eleven-pagina.vercel.app';

// label + alt in messages projects.eleven.shot_labels[i] / shots_alt[i], same order
export const ELEVEN_SCREENSHOTS = [
  { src: '/projects/eleven/eleven-01-hero.jpg' },
  { src: '/projects/eleven/eleven-02-manifiesto.jpg' },
  { src: '/projects/eleven/eleven-03-servicios.jpg' },
  { src: '/projects/eleven/eleven-04-muro.jpg' },
  { src: '/projects/eleven/eleven-05-portafolio.jpg' },
  { src: '/projects/eleven/eleven-06-terraza.jpg' },
] as const;

// ── Case studies (KIBBO, LEEX) ──
// Screenshots: src here; label + caption (also used as alt) live in
// messages/<locale>.json under projects.<case>.shots[i], same order.

export const KIBBO_URL = 'https://kibbo.io/en';

export const KIBBO_STACK = [
  'Next.js 16', 'React 19', 'TypeScript', 'Tailwind CSS v4', 'GSAP',
  'JSON-LD', 'GA4', 'AWS Amplify', 'Claude Code',
] as const;

// 01-06: Track C (2880 px reducidos a 1920×960; 03 y 04 en su versión difuminada: QR, serie y tenant).
// 07-08 (recurso y móvil) no tienen captura nueva: siguen las del 2026-09-30.
export const KIBBO_SCREENSHOTS = [
  '/projects/kibbo/kibbo-01-hero.jpg',
  '/projects/kibbo/kibbo-02-problems.jpg',
  '/projects/kibbo/kibbo-03-on-the-phone-blur.jpg',
  '/projects/kibbo/kibbo-04-dashboard-blur.jpg',
  '/projects/kibbo/kibbo-05-community.jpg',
  '/projects/kibbo/kibbo-06-trust.jpg',
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
  'Supabase (PostgreSQL + RLS)', 'pgvector', 'Claude API',
  'pdfplumber + OCR', 'pytest', 'Vitest', 'GitHub Actions', 'Vercel',
] as const;

// Opens with the verdict (the product's core); the detection shot, which shows the
// "incomplete sweep" warning, sits 3rd with a caption that frames it as a decision.
// Track C: datos difuminados en la captura; veredicto y tablero, en su versión _work (blur).
export const LEEX_SCREENSHOTS = [
  '/projects/leex/leex-04-veredicto-blur.jpg',
  '/projects/leex/leex-02-deteccion-no-apto.jpg',
  '/projects/leex/leex-01-deteccion-lote.jpg',
  '/projects/leex/leex-05-tablero-blur.jpg',
  '/projects/leex/leex-03-fuentes.jpg',
] as const;

// ── Videos demostrativos de Projects (Track C, 2026-10-11) ──
// No son Frame by Frame (VIDEOS, más abajo). Loops mudos 1280×720: MP4 H.264 primero y WebM VP9 de respaldo.
// Los usan la placa del negatoscopio (plate-video.js, VideoTexture) y el caso (ProjectDemo.tsx).
// alt en messages projects.<id>.demo_alt. LEEX: el poster dice «IN DEVELOPMENT — LAUNCHING SOON».
export type ProjectDemoId = 'traumavision' | 'kibbo' | 'leex' | 'eleven';
export interface ProjectDemo {
  mp4: string;
  webm: string;
  poster: string;
  width: number;
  height: number;
  duration: string; // m:ss
}
const demo = (id: ProjectDemoId, duration: string): ProjectDemo => ({
  mp4: `/projects/${id}/${id}-demo.mp4`,
  webm: `/projects/${id}/${id}-demo.webm`,
  poster: `/projects/${id}/${id}-demo-poster.jpg`,
  width: 1280, height: 720, duration,
});
export const PROJECT_DEMOS: Readonly<Record<ProjectDemoId, ProjectDemo>> = {
  traumavision: demo('traumavision', '0:36'),
  kibbo: demo('kibbo', '0:33'),
  leex: demo('leex', '0:30'),
  eleven: demo('eleven', '0:30'),
};

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
