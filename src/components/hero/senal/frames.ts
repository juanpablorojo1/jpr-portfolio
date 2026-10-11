/* «Señal» · Frame by Frame: la sala de proyección (escritorio ≥1024 con la escena viva).
   Un solo guion compartido por la escena 3D (projector.js: cámara, haz, pantallas, foco) y el HTML (VideosStage.tsx:
   rótulos, controles, alto de la sección). Mismas unidades que Projects (gallery.ts): u = viewports de scroll desde el
   aterrizaje del About. La sección de Video entra por abajo en u = GAL_SECTION_VH (10,3) y llega arriba en 11,3.

   Coreografía: Projects deja el cabezal como única luz en el umbral del último vano. Acá el cabezal se despega del
   riel, sube por el vano y sigue por un riel de techo: la señal se vuelve la lámpara de un proyector. Del otro lado
   del vano hay una sala a oscuras con cinco pantallas colgadas a distinta profundidad, en el orden fijo de Juan.
   El haz rojo (una pirámide de luz entre el polvo, de la lámpara a las cuatro esquinas de la pantalla) se posa en
   una pantalla por vez: la enciende y el video corre. Entre una y otra, la lámpara avanza por el riel de techo, el
   haz barre hasta la siguiente y la cámara hace travelling + rack focus. Al apagarse la última pantalla, el haz se
   apaga y el polvo que estaba dentro queda encendido: la luz descompuesta en puntos, para Stack. */

import { GAL_SECTION_VH } from './gallery';

/** u en que la sección de Video entra por abajo (= alto de Projects) */
export const FBF_V0 = GAL_SECTION_VH;
/** el cabezal sube del riel al riel de techo [empieza, llega] */
export const FBF_RISE: readonly [number, number] = [10.05, 11.05];
/** el haz se enciende [empieza, pleno] */
export const FBF_BEAM: readonly [number, number] = [10.8, 11.35];
/** titular, nota de posproducción y stack */
export const FBF_INTRO: readonly [number, number] = [11.2, 12.15];
/** estadía frente a cada pantalla [entra, sale], en el orden de VIDEOS (content.ts) */
export const FBF_DWELLS: ReadonlyArray<readonly [number, number]> = [
  [12.45, 13.55],   // incubadora B6
  [14.05, 15.15],   // KIBBO
  [15.65, 16.65],   // V8v
  [17.15, 18.25],   // resonancia
  [18.75, 19.95],   // comparación de modelos (horizontal)
];
/** la última pantalla se apaga y el haz se descompone en puntos */
export const FBF_OFF = 20.0;
export const FBF_END = 20.75;
/** alto de la sección en viewports: Stack entra por abajo en u = FBF_V0 + FBF_SECTION_VH */
export const FBF_SECTION_VH = 10.5;

/** Pantallas en coordenadas del pasillo (corridor.js: x a lo ancho, y arriba, −z hacia el fondo; la sala empieza
    en el último vano, z −62). side: −1 izquierda, 1 derecha (el texto va del lado contrario). yaw: giro hacia el
    pasillo (nunca de frente a la cámara). h: alto en m (el ancho sale del video). Mismo orden que VIDEOS. */
export const FBF_SCREENS: ReadonlyArray<{ side: -1 | 1; x: number; y: number; z: number; yaw: number; h: number }> = [
  { side: -1, x: -2.6, y: 1.95, z: -73, yaw: 0.42, h: 2.7 },
  { side: 1, x: 2.8, y: 2.15, z: -81, yaw: -0.45, h: 2.7 },
  { side: -1, x: -2.2, y: 1.8, z: -88.5, yaw: 0.5, h: 2.6 },
  { side: 1, x: 3.0, y: 2.2, z: -96, yaw: -0.42, h: 2.7 },
  { side: -1, x: -0.4, y: 2.15, z: -105, yaw: 0.2, h: 2.3 },
];

export const fbfTagWanted = (k: number, u: number) => u >= FBF_DWELLS[k][0] - 0.15 && u <= FBF_DWELLS[k][1] + 0.1;
export const fbfIntroWanted = (u: number) => u >= FBF_INTRO[0] && u <= FBF_INTRO[1];
export const fbfChromeWanted = (u: number) => u >= FBF_INTRO[0] && u <= FBF_OFF + 0.15;
/** pantalla en foco para el HTML (contador): la última cuya estadía ya empezó (con medio viewport de anticipo) */
export const fbfCurrent = (u: number) => FBF_DWELLS.reduce((a, d, i) => (u >= d[0] - 0.5 ? i : a), 0);
