/* «Señal» · Experience: el electrocardiograma vertical (escritorio ≥1024 con la escena viva). U6.
   Un solo guion compartido por la escena 3D (ecg.js: cámara, traza, latidos, foco, rótulos anclados) y el HTML
   (ExperienceStage.tsx: titular, fichas de cada rol, educación, reconocimientos, alto de la sección).

   Unidades: las de Projects, Frame by Frame y Stack (u = viewports de scroll desde el aterrizaje del About), pero
   contadas desde que Experience entra por abajo: e = u − v0. v0 no es una constante: la mide el HTML (el borde
   inferior de la sección anterior), así el guion no depende del alto de Stack.

   Coreografía: Stack deja una sola rama, el camino de la señal por la red, enderezada en una línea vertical. Acá esa
   línea vuelve a ser electrocardiograma, ahora vertical, y se lee de arriba abajo: cada rol es un latido (P-QRS-T)
   con un tick rojo y la fecha en mono. La cámara baja por la traza (crane) y la rodea de un lado al otro entre
   latidos (orbit corto), con rack focus de un latido al siguiente. Detrás, dos derivaciones fantasma y el papel
   milimetrado del monitor, en oblicuo; adelante, polvo fuera de foco. Educación y reconocimientos son latidos cada
   vez más juntos; al final los latidos se aceleran y las tres derivaciones convergen en un solo punto rojo que
   late: Contact lo recibe. */

export type ExpWin = readonly [number, number];
export type ExpPlan = {
  /** la cámara deja la toma anterior y baja a la traza */
  enter: ExpWin;
  /** plano de situación: titular */
  intro: ExpWin;
  /** estadía frente a cada rol [entra, sale] */
  roles: ExpWin[];
  /** educación y reconocimientos (un grupo de latidos cada uno) */
  edu: ExpWin;
  rec: ExpWin;
  /** los latidos se aceleran y las derivaciones convergen en el punto */
  out: ExpWin;
  /** alto de la sección en viewports: Contact entra por abajo en e = vh */
  vh: number;
};

/* DWELL 0,5 (era 0,7): el cruce entre roles tiene medio viewport. Con 0,3 la cámara giraba ~30° en 0,15 vh
   (≈280°/vh medido, un latigazo); las transiciones de Stack giran ≤54°/vh. GAP: cruce hacia educación y
   reconocimientos (era 0,4; la cámara baja varios metros ahí). */
const R0 = 2.25, STEP = 1.0, DWELL = 0.5, GAP = 0.6;

/** guion de la sección para n roles (messages experience.items) */
export function expPlan(nRoles: number): ExpPlan {
  const n = Math.max(1, nRoles);
  const roles: ExpWin[] = Array.from({ length: n }, (_, k) => [R0 + k * STEP, R0 + k * STEP + DWELL] as const);
  const last = roles[n - 1][1];
  const edu: ExpWin = [last + GAP, last + GAP + 0.8];
  const rec: ExpWin = [edu[1] + GAP, edu[1] + GAP + 0.8];
  // el punto se forma antes de que Contact empiece a subir (e = vh) y queda arriba del cuadro mientras lo tapa
  const out: ExpWin = [rec[1] + 0.1, rec[1] + 0.95];
  return { enter: [-0.2, 1.05], intro: [0.7, 1.7], roles, edu, rec, out, vh: rec[1] + 0.85 };
}

/** lado de la ficha del rol k (1 derecha, −1 izquierda); el pico del latido apunta al lado contrario */
export const expRoleSide = (k: number): 1 | -1 => (k % 2 ? -1 : 1);
export const EXP_EDU_SIDE = -1 as const;
export const EXP_REC_SIDE = 1 as const;

export const expIntroWanted = (P: ExpPlan, e: number) => e >= P.intro[0] && e <= P.intro[1];
/* el primer rol entra 0,2 antes que los demás (−0,45): entre el titular (sale en e 1,7) y la primera ficha quedaba un
   tramo de 0,3 vh sin texto con la traza gris sola (D-13). Los demás no: pisarían la salida de la ficha anterior. */
export const expRoleWanted = (P: ExpPlan, k: number, e: number) => e >= P.roles[k][0] - (k === 0 ? 0.45 : 0.25) && e <= P.roles[k][1] + 0.12;
/* educación entra 0,12 antes de su estadía (era 0,3): antes, con la cámara todavía bajando, los tres latidos se ven
   comprimidos en perspectiva y sus rótulos se pisaban (medido a 1440: 5 solapes en e 8,1–8,15) */
export const expEduWanted = (P: ExpPlan, e: number) => e >= P.edu[0] - 0.12 && e <= P.edu[1] + 0.12;
export const expRecWanted = (P: ExpPlan, e: number) => e >= P.rec[0] - 0.3 && e <= P.rec[1] + 0.25;
export const expChromeWanted = (P: ExpPlan, e: number) => e >= P.roles[0][0] - 0.45 && e <= P.rec[1] + 0.25;
/** rol en foco para el contador: cambia en la mitad del cruce (antes iba medio viewport adelantado: «02» con la ficha 01) */
export const expCurrent = (P: ExpPlan, e: number) => P.roles.reduce((a, d, i) => (e >= d[0] - (STEP - DWELL) / 2 ? i : a), 0);
