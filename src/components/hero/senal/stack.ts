/* «Señal» · Stack: la red por capas (escritorio ≥1024 con la escena viva). U5.
   Un solo guion compartido por la escena 3D (network.js: cámara, red, foco, rótulos de cada nodo) y el HTML
   (StackStage.tsx: titular, cabecera de cada capa, alto de la sección). Mismas unidades que Projects y Frame by Frame
   (gallery.ts, frames.ts): u = viewports de scroll desde el aterrizaje del About. Stack entra por abajo en
   u = STK_V0 (= fin de la sección de Video) y llega arriba en STK_V0 + 1.

   Coreografía: Frame by Frame deja el polvo del haz encendido como puntos. Los puntos se conectan y la señal los
   enhebra en una línea roja que sale de la nube, pasa por encima de la última pantalla y baja hacia la red. La red
   son cuatro arborizaciones colgadas en la oscuridad, cada una más adelante y más abajo que la anterior (una pila):
   biomédica, IA, web, automatización. La señal entra a cada una por arriba, baja por su tronco y la onda se abre por
   las ramas hasta cada nodo, que es una tecnología: el nodo destella y su rótulo aparece. La cámara recorre la pila
   en oblicuo (crane hacia abajo + dolly, rack focus entre capas). Al final la red se apaga y el camino de la señal
   por la última capa se endereza en una sola línea vertical que sigue hacia abajo: Experience la recibe. */

import { FBF_V0, FBF_SECTION_VH, FBF_END } from './frames';

/** u en que la sección de Stack entra por abajo (= fin de Video) */
export const STK_V0 = FBF_V0 + FBF_SECTION_VH;
/** corrimiento del guion de Stack respecto del diseño original (FBF_END 20,75): el Tambor 360 de Frame by Frame
    (U3 2026-10-12) acortó la sección de Video. Los números de abajo son los aprobados + STK_SHIFT: misma coreografía,
    empieza antes. */
export const STK_SHIFT = FBF_END - 20.75;
const sh = (u: number) => u + STK_SHIFT;
/** los puntos del haz se conectan [empieza, conectados] */
export const STK_CONNECT: readonly [number, number] = [FBF_END, sh(21.55)];
/** titular de la sección (la señal sale de la nube) */
export const STK_INTRO: readonly [number, number] = [sh(21.45), sh(22.45)];
/** estadía frente a cada capa [entra, sale]: biomédica, IA, web, automatización */
export const STK_DWELLS: ReadonlyArray<readonly [number, number]> = [
  [sh(22.85), sh(23.95)],
  [sh(24.55), sh(25.65)],
  [sh(26.25), sh(27.35)],
  [sh(27.95), sh(29.05)],
];
/** la red se apaga y el camino de la señal se endereza [empieza, recta] */
export const STK_OUT: readonly [number, number] = [sh(29.25), sh(30.0)];
export const STK_END = STK_OUT[1];
/** alto de la sección en viewports: Experience entra por abajo en u = STK_V0 + STK_SECTION_VH */
export const STK_SECTION_VH = 9.4;

/** capas en el orden del recorrido; key = grupo de messages skills.<key>. side: de qué lado va la cabecera de la
    capa (−1 izquierda, 1 derecha); los nodos con nombre ocupan el otro lado del cuadro. */
export const STK_LAYERS: ReadonlyArray<{ key: 'cluster_bio' | 'cluster_ai' | 'cluster_web' | 'cluster_tools'; side: -1 | 1 }> = [
  { key: 'cluster_bio', side: -1 },
  { key: 'cluster_ai', side: 1 },
  { key: 'cluster_web', side: -1 },
  { key: 'cluster_tools', side: 1 },
];

/** cabecera de la capa k visible (un poco antes y después de la estadía) */
export const stkLayerWanted = (k: number, u: number) => u >= STK_DWELLS[k][0] - 0.3 && u <= STK_DWELLS[k][1] + 0.12;
/** nodos con nombre de la capa k: la escena los enciende con la onda dentro de esta ventana */
export const stkItemsWindow = (k: number, u: number) => u >= STK_DWELLS[k][0] - 0.42 && u <= STK_DWELLS[k][1] + 0.12;
export const stkIntroWanted = (u: number) => u >= STK_INTRO[0] && u <= STK_INTRO[1];
export const stkChromeWanted = (u: number) => u >= STK_INTRO[0] && u <= STK_DWELLS[STK_DWELLS.length - 1][1] + 0.15;
/** capa en foco para el HTML (contador): la última cuya estadía ya empezó (con medio viewport de anticipo) */
export const stkCurrent = (u: number) => STK_DWELLS.reduce((a, d, i) => (u >= d[0] - 0.5 ? i : a), 0);
/** onda de la capa k: 0 cuando la señal llega a la raíz, 1 cuando alcanzó todos los nodos */
export const stkWave = (k: number, u: number) => {
  const a = STK_DWELLS[k][0] - 0.45, b = STK_DWELLS[k][0] + 0.2;
  return Math.min(1, Math.max(0, (u - a) / (b - a)));
};
