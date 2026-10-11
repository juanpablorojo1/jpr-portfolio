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
/** side: −1 pared izquierda, 1 derecha. z: profundidad en el pasillo (m). Imágenes de public/projects/<proyecto>/
    (Track C, 2026-10-10; donde había versión difuminada en _work/ va esa). La primera película (la del índice) es el
    thumb del proyecto: el detalle que lo identifica. El video demo de cada placa sale de PROJECT_DEMOS (content.ts),
    por id. led: la placa es una pantalla LED con la portada del proyecto (nombre + línea técnica, nítidos) en lugar
    de una captura en negatoscopio (pedido de Juan, 2026-10-11: «se ve borroso, prefiero que sea una pantalla LED que
    tenga la portada del proyecto»). La portada se dibuja con el texto del rótulo HTML (data-led-*, ProjectsGallery);
    sin captura secundaria ni video demo encima. Por ahora sólo TraumaVision (las otras, después del frame). */
export const GAL_PROJECTS: ReadonlyArray<{
  id: GalleryId; side: -1 | 1; z: number; main: string; sec: string;
  films: ReadonlyArray<readonly [string, number]>; blur?: boolean; far?: boolean; led?: boolean;
}> = [
  { id: 'traumavision', side: -1, z: -8, main: 'traumavision/tv-01-resultado-revisar.jpg', sec: 'traumavision/tv-04-historial.jpg', led: true,
    films: [['traumavision/thumb.jpg', 0.38], ['traumavision/tv-05-metricas-acierto.jpg', 0.82]] },
  { id: 'kibbo', side: 1, z: -20, main: 'kibbo/kibbo-01-hero.jpg', sec: 'kibbo/kibbo-04-dashboard-blur.jpg',
    films: [['kibbo/thumb.jpg', 0.3], ['kibbo/kibbo-03-on-the-phone-blur.jpg', 0.65]] },
  { id: 'leex', side: -1, z: -32, main: 'leex/leex-04-veredicto-blur.jpg', sec: 'leex/leex-01-deteccion-lote.jpg', blur: true, far: true,
    films: [['leex/thumb.jpg', 0.3], ['leex/leex-05-tablero-blur.jpg', 0.5]] },
  { id: 'eleven', side: 1, z: -44, main: 'eleven/eleven-01-hero.jpg', sec: 'eleven/eleven-05-portafolio.jpg',
    films: [['eleven/thumb.jpg', 0.3], ['eleven/eleven-04-muro.jpg', 0.5]] },
];

/** rótulo visible (lo esencial de cada proyecto en el espacio): un poco antes y después de la estadía */
export const tagWanted = (k: number, u: number) => u >= GAL_DWELLS[k][0] - 0.16 && u <= GAL_DWELLS[k][1] + 0.08;
