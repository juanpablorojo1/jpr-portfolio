/* «Señal» · Contact: la convergencia (escritorio ≥1024 con la escena viva). U7.
   Un solo guion compartido por la escena 3D (convergence.js: cámara, líneas, punto, ancla del CTA) y el HTML
   (ContactStage.tsx: titular, ficha de contacto, pie, alto de la sección).

   Unidades: c = u − v0, con u = viewports de scroll desde el aterrizaje del About (las de Projects, Frame by Frame,
   Stack y Experience) y v0 = u en que Contact asoma por abajo (lo mide el HTML: el borde superior de Contact en el
   flujo). c = 0: Contact asoma por abajo; c = 1: su borde superior llega arriba; c = CTC_VH: fin de la página.

   Coreografía: Experience deja un punto rojo que late debajo de las tres derivaciones. Acá todas las líneas del
   recorrido (la traza del hero, el riel del About y del pasillo, el haz del proyector, la rama de la red, las
   derivaciones) llegan de la oscuridad y convergen en ese punto. Cada línea lleva un pulso que llega al punto en el
   pico R del reloj del hero: el punto late cuando llegan todos. La cámara baja del picado del final de Experience a un
   3/4 casi a nivel (crane + orbit corto) y sigue acercándose despacio hasta el final de la página. El punto es el CTA:
   el HTML pone el enlace encima de su proyección. */

/** alto de la sección en viewports (Contact es lo último de la página: c llega a CTC_VH al final del scroll) */
export const CTC_VH = 1.9;

export const CTC = {
  /** la escena de Contact toma la cámara (la de Experience ya llegó a su última llave en c ≈ 0,1) */
  take: 0.12,
  /** el punto de Experience le pasa el latido al de Contact */
  handoff: [0.12, 0.42] as const,
  /** las líneas aparecen */
  appear: [-0.05, 0.6] as const,
  /** llaves de cámara: crane intermedio, llegada (Contact arriba) y el final de la página */
  mid: 0.5, arrive: 1.0,
  /** titular y resto del texto: entran (sale un poco antes, histéresis) */
  head: [0.42, 0.5] as const,
  body: [0.56, 0.64] as const,
} as const;

/** dónde cae el punto en el cuadro (NDC) en la llegada y al final: a la derecha, encima de la mitad */
export const CTC_DOT_NDC = { x: 0.3, y: 0.1 } as const;
