/* «Señal» · Projects: el negatoscopio (escritorio ≥1024 con la escena viva). Port de la maqueta A
   (clients/jpr-portfolio/maquetas/2026-10-10-projects/a/), elegida por Juan el 2026-10-10.
   Un solo guion compartido por la escena 3D (corridor.js: cámara, placas, foco) y el HTML (ProjectsGallery.tsx:
   rótulos en el espacio, casos, alto de la sección). Las unidades son viewports de scroll contados desde el
   aterrizaje del About (L): u = (scrollY − L) / innerHeight. La zona de Projects llega arriba en u = 1 y queda
   pegada hasta que la tapa Video (entra por abajo en u = GAL_SECTION_VH).

   Coreografía: el About se despide (0,35); la cámara gira 90° y la recta del About se vuelve el riel que entra a un
   pasillo de radiología a oscuras. Cada proyecto es una placa en un negatoscopio de pared, en paredes alternadas y a
   distinta profundidad; la señal sube por un ramal y lo enciende. Estadía = la cámara encara la placa en oblicuo con
   rack focus desde las películas colgadas en primer plano. Al final los negatoscopios se apagan y la cámara sigue al
   cabezal hasta el final del riel: queda como la única luz, y Frame by Frame lo recibe. */

export const GAL_ABOUT_OUT = 0.35;          // el About se va y arranca el giro
/** estadía de la cámara frente a cada placa [entra, sale], en el orden del encargo */
export const GAL_DWELLS: ReadonlyArray<readonly [number, number]> = [
  [2.2, 3.4],     // TraumaVision (pared izquierda)
  [4.2, 5.3],     // KIBBO (derecha)
  [6.1, 7.1],     // LEEX (izquierda, más lejos; el foco se queda corto)
  [7.9, 9.0],     // Eleven (derecha)
];
export const GAL_END = 10.0;                // la cámara llega al final del riel: el cabezal solo
export const GAL_SECTION_VH = 10.3;         // alto de la sección en viewports (Video entra por abajo en u = 10,3)

export type GalleryId = 'traumavision' | 'kibbo' | 'leex' | 'eleven';
/** side: −1 pared izquierda, 1 derecha. z: profundidad en el pasillo (m). Imágenes de public/images. */
export const GAL_PROJECTS: ReadonlyArray<{
  id: GalleryId; side: -1 | 1; z: number; main: string; sec: string;
  films: ReadonlyArray<readonly [string, number]>; blur?: boolean; far?: boolean; scan?: boolean;
}> = [
  { id: 'traumavision', side: -1, z: -8, main: 'traumavision-analisis.jpg', sec: 'traumavision-home.jpg', scan: true,
    films: [['traumavision-dashboard.jpg', 0.18], ['traumavision-metrics.jpg', 0.5]] },
  { id: 'kibbo', side: 1, z: -20, main: 'kibbo-en-01-hero.jpg', sec: 'kibbo-en-08-mobile.jpg',
    films: [['kibbo-en-04-dashboard.jpg', 0.5], ['kibbo-en-08-mobile.jpg', 0.5]] },
  { id: 'leex', side: -1, z: -32, main: 'leex-02-veredicto.jpg', sec: 'leex-04-tablero.jpg', blur: true, far: true,
    films: [['leex-03-mi-trabajo.jpg', 0.3], ['leex-04-tablero.jpg', 0.6]] },
  { id: 'eleven', side: 1, z: -44, main: 'eleven-01-hero.jpg', sec: 'eleven-05-portfolio.jpg',
    films: [['eleven-04-servicios3.jpg', 0.5], ['eleven-01-hero.jpg', 0.3]] },
];

/** rótulo visible (lo esencial de cada proyecto en el espacio): un poco antes y después de la estadía */
export const tagWanted = (k: number, u: number) => u >= GAL_DWELLS[k][0] - 0.16 && u <= GAL_DWELLS[k][1] + 0.08;
