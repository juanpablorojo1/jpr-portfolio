/* «Señal» · Projects: la vitrina en el vacío (escritorio ≥1024 con la escena viva). Port de la maqueta A
   (clients/jpr-portfolio/maquetas/2026-10-11-projects/a/), elegida por Juan el 2026-10-12 con un cambio: sin despiece,
   cada proyecto es UNA laptop íntegra con el home real del producto nítido.
   Un solo guion compartido por la escena 3D (vitrina.js dentro de corridor.js: cámara, laptops, señal) y el HTML
   (ProjectsGallery.tsx: bloque de texto, caso, alto de la sección). Las unidades son viewports de scroll contados desde
   el aterrizaje del About (L): u = (scrollY − L) / innerHeight. La zona de Projects llega arriba en u = 1 y queda
   pegada hasta que la tapa Video (entra por abajo en u = GAL_SECTION_VH).

   Coreografía: el About se despide (0,35); la recta del About se recoge y dibuja la vitrina; adentro aparece la laptop
   de TraumaVision cerrada, la señal la abre y la pantalla se enciende desde la línea roja hacia arriba. Estadía = la
   cámara orbita ~28° alrededor del objeto entero, el nombre gigante se desliza detrás. Relevo = la tapa se entorna, la
   señal sale del canto como un cometa, cruza el vacío y la laptop siguiente llega girando desde la profundidad y abre la
   tapa; el layout se espeja. Salida: la última laptop se cierra en una línea roja que corre por el riel hasta el
   umbral: el cabezal queda solo y Frame by Frame lo recibe (frames.ts, sin cambios). */

export const GAL_ABOUT_OUT = 0.35;          // el About se va y la recta empieza a recogerse
/** estadía de la cámara frente a cada laptop [entra, sale], en el orden del sitio */
export const GAL_DWELLS: ReadonlyArray<readonly [number, number]> = [
  [1.35, 2.55],   // TraumaVision (texto a la izquierda)
  [3.55, 4.75],   // KIBBO (texto a la derecha)
  [5.75, 6.95],   // Eleven (izquierda)
  [7.95, 9.0],    // LEEX (derecha)
];
export const GAL_END = 10.0;                // la línea roja llega al final del riel: el cabezal solo
export const GAL_SECTION_VH = 10.3;         // alto de la sección en viewports (Video entra por abajo en u = 10,3)

/** entrada: la recta se recoge hasta el pie de la notebook; el cenital se enciende de golpe (VIT_OPEN[0]); la tapa se
    abre; la pantalla se enciende. Todo termina antes de que entre el texto (GAL_DWELLS[0][0] − 0,16 = 1,19): así la
    pantalla nunca está negra con el bloque ya armado. */
export const VIT_TRACE: readonly [number, number] = [0.4, 0.88];
export const VIT_OPEN: readonly [number, number] = [0.9, 1.05];
export const VIT_POWER: readonly [number, number] = [1.0, 1.14];

export type GalleryId = 'traumavision' | 'kibbo' | 'eleven' | 'leex';
/** side: de qué lado va el texto (−1 izquierda, 1 derecha); la laptop queda del otro. screen: el home real del
    producto (public/projects/<proyecto>/), recortado a 2:1 desde la columna cropX (px de la imagen). word: el nombre
    gigante detrás. pos / yaw: dónde está la laptop en el vacío (coordenadas de la vitrina: x a la derecha del About,
    y arriba, −z hacia la profundidad; TraumaVision en el origen, sobre la recta). */
export const GAL_PROJECTS: ReadonlyArray<{
  id: GalleryId; side: -1 | 1; screen: string; cropX?: number; word: string;
  pos: readonly [number, number, number]; yaw: number;
}> = [
  { id: 'traumavision', side: -1, screen: 'traumavision/tv-01-resultado-revisar.jpg', word: 'TRAUMAVISION', pos: [0, 0, 0], yaw: 0 },
  { id: 'kibbo', side: 1, screen: 'kibbo/kibbo-01-hero.jpg', word: 'KIBBO', pos: [-16, 0.25, -9], yaw: 0.22 },
  { id: 'eleven', side: -1, screen: 'eleven/eleven-01-hero.jpg', word: 'ELEVEN', pos: [-32, 0.05, -3.5], yaw: -0.16 },
  { id: 'leex', side: 1, screen: 'leex/leex-01-deteccion-lote.jpg', cropX: 18, word: 'LEEX', pos: [-47.5, 0, -10], yaw: 0.2 },
];

/** bloque de texto visible: un poco antes y después de la estadía */
export const tagWanted = (k: number, u: number) => u >= GAL_DWELLS[k][0] - 0.16 && u <= GAL_DWELLS[k][1] + 0.08;
