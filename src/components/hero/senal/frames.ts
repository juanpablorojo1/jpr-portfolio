/* «Señal» · Frame by Frame: el Tambor 360 (escritorio ≥1024 con la escena viva). U3 2026-10-12, port de la maqueta A
   (clients/jpr-portfolio/maquetas/2026-10-12-videos/a/), elegida por Juan («A», 2026-10-12). Reemplaza a la sala de
   proyección con travelling por scroll (U4). Pedido: «una galeria 360 con videos, sin explicarlos, solo mostrar los
   videos con una galeria que se va pasando si yo elijo».
   Un solo guion compartido por la escena 3D (projector.js: tambor, señal, haz, cámara) y el HTML (VideosStage.tsx:
   flechas, teclado, arrastre, sonido, alto de la sección). Mismas unidades que Projects (gallery.ts): u = viewports de
   scroll desde el aterrizaje del About. La sección de Video entra por abajo en u = GAL_SECTION_VH (10,3).

   Coreografía: la última laptop de Projects (LEEX) se cierra en una línea roja que corre por el riel hasta el umbral.
   Desde ahí la línea sigue por el piso, en el vacío, hasta un tambor de cinco pantallas LED: sube por el zócalo y se
   abre en el anillo rojo de la base; las caras se encienden desde el anillo hacia arriba. La cámara viaja detrás de la
   señal y queda frente al tambor (la cara de frente ≈ 72 % del alto del cuadro). Desde ahí el scroll no gira nada: el
   tambor gira sólo si el usuario lo elige (flechas, ← →, arrastre) y da la vuelta completa (05 → 01). Al seguir
   scrolleando, las caras se apagan hacia el anillo, el haz tenue se descompone en puntos y la cámara sube: Stack. */

import { GAL_SECTION_VH } from './gallery';

/** u en que la sección de Video entra por abajo (= alto de Projects) */
export const FBF_V0 = GAL_SECTION_VH;
/** la señal corre por el piso desde el umbral hasta el zócalo del tambor [sale, llega] */
export const FBF_RUN: readonly [number, number] = [10.05, 10.95];
/** el anillo se enciende alrededor del tambor y las caras se encienden desde él [empieza, pleno] */
export const FBF_BEAM: readonly [number, number] = [10.9, 11.5];
/** la cámara viaja detrás de la señal hasta quedar frente al tambor [sale del umbral, llega] */
export const FBF_INTRO: readonly [number, number] = [10.0, 11.55];
/** estadía frente al tambor [llega, se va]: el scroll no gira nada; flechas, teclado y arrastre sí */
export const FBF_STAY: readonly [number, number] = [11.55, 13.25];
/** las caras se apagan hacia el anillo y el haz se descompone en puntos */
export const FBF_OFF = 13.3;
export const FBF_END = 14.0;
/** alto de la sección en viewports: Stack entra por abajo en u = FBF_V0 + FBF_SECTION_VH (FBF_END + 0,05, como antes) */
export const FBF_SECTION_VH = FBF_END + 0.05 - FBF_V0;

/** Tambor en coordenadas del pasillo (corridor.js: x a lo ancho, y arriba, −z hacia el fondo; el riel termina en el
    umbral, z −61,3). El tambor está sobre el eje del riel, con la cara de frente mirando al umbral. FBF_HOME es esa
    cara en reposo: Stack arma su nube entre la lámpara (encima y adelante) y ella (network.js). h/w en m. */
export const FBF_DRUM = {
  /** alto y ancho de cada cara (9:16) */
  h: 2.6, w: 2.6 * 9 / 16,
  /** zócalo: las caras empiezan a esta altura (el anillo rojo) */
  base: 0.14,
  /** z de la cara de frente */
  frontZ: -105,
} as const;
export const FBF_HOME = { x: 0, y: FBF_DRUM.base + FBF_DRUM.h / 2, z: FBF_DRUM.frontZ, yaw: 0, h: FBF_DRUM.h } as const;

/** controles de la galería visibles (flechas, posición, sonido) */
export const fbfCtrlWanted = (u: number) => u >= FBF_STAY[0] - 0.08 && u <= FBF_STAY[1] + 0.12;
/** el tambor acepta giros (encendido y con la cámara frente a él) */
export const fbfCanTurn = (u: number) => u >= FBF_STAY[0] - 0.12 && u <= FBF_STAY[1] + 0.05;
/** rótulo de sección */
export const fbfChromeWanted = (u: number) => u >= FBF_BEAM[0] && u <= FBF_OFF + 0.15;
