/* «Señal» · Projects: la galería espacial (escritorio ≥1024 con la escena viva).
   Un solo guion compartido por la escena 3D (scene.js: cámara, cabezal, planos) y el HTML (ProjectsGallery.tsx:
   textos, alto de la sección). Las unidades son viewports de scroll contados desde el aterrizaje del About (L):
   u = (scrollY − L) / innerHeight. La zona de Projects llega arriba en u = 1 y queda pegada hasta que la tapa Video.

   Coreografía: el About se despide (0,35), la cámara levanta la mirada del riel y la recta baja al piso de la
   galería (GAL_LINE) mientras el cabezal de la señal se enciende y empieza a caminar hacia la izquierda.
   Cada proyecto es un plano parado sobre el riel; el cabezal es la única luz: lo cruza de derecha a izquierda
   durante la estadía de la cámara (en TraumaVision ese cruce es el escaneo radiográfico) y sigue al próximo.
   Al final el cabezal queda solo, al final del riel, y la sección siguiente lo recibe. */

export const GAL_ABOUT_OUT = 0.35;          // el About se va y arranca la apertura
export const GAL_OPEN_END = 1.25;           // la cámara llega a TraumaVision
/** estadía de la cámara frente a cada plano [entra, sale], en el orden del encargo */
export const GAL_DWELLS: ReadonlyArray<readonly [number, number]> = [
  [1.25, 2.25],   // TraumaVision
  [2.75, 4.35],   // KIBBO
  [4.85, 6.45],   // LEEX
  [6.95, 7.85],   // Eleven
];
export const GAL_END = 8.5;                 // el cabezal quieto al final del riel
export const GAL_SECTION_VH = 8.6;          // alto de la sección en viewports (Video entra en u = 8,6)
/** fracción del alto del viewport donde cae la recta del riel en la galería (el piso) */
export const GAL_LINE = 0.76;

export type GalleryId = 'traumavision' | 'kibbo' | 'leex' | 'eleven';
export const GAL_PROJECTS: ReadonlyArray<{ id: GalleryId; img: string; img2: string; scan?: boolean; blur?: boolean }> = [
  { id: 'traumavision', img: '/images/traumavision-analisis.jpg', img2: '/images/traumavision-metrics.jpg', scan: true },
  { id: 'kibbo', img: '/images/kibbo-en-01-hero.jpg', img2: '/images/kibbo-en-04-dashboard.jpg' },
  { id: 'leex', img: '/images/leex-02-veredicto.jpg', img2: '/images/leex-04-tablero.jpg', blur: true },
  { id: 'eleven', img: '/images/eleven-01-hero.jpg', img2: '/images/eleven-04-servicios3.jpg' },
];
