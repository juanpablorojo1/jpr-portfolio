/* Trabajo de arranque que no bloquea el hilo principal (delivery-auditor D-01: TBT y forced reflow).
   - idleTask(fn): corre fn en un período ocioso, en su propia tarea y de a uno (una cola), con tope de espera.
     Lo usan los escenarios de las secciones lejanas (Projects, Frame by Frame, Stack, Experience, Contact) para partir
     sus titulares y prepararlos fuera de la hidratación: antes todo corría junto en una sola tarea larga.
   - setBatch(jobs): el mismo resultado que gsap.set(targets, vars) para cada grupo, sin lecturas y escrituras
     intercaladas. gsap.set lee el estilo computado de cada elemento la primera vez que lo toca (transform y opacidad);
     entre set y set eso obliga a recalcular estilo/layout una vez por elemento. Acá se lee todo primero (GSAP cachea el
     transform parseado), se escribe la opacidad en línea (GSAP lee la opacidad en línea antes que la computada) y
     recién después se hace el set, que ya no lee nada. */
import gsap from 'gsap';

type Job = { fn: () => void; dead: boolean };
const queue: Job[] = [];
let pumping = false;

function next() {
  const job = queue.shift();
  if (!job) { pumping = false; return; }
  let done = false, idleId = 0, timer = 0;
  const run = () => {
    if (done) return;
    done = true;
    if (idleId && typeof cancelIdleCallback === 'function') cancelIdleCallback(idleId);
    clearTimeout(timer);
    if (!job.dead) { try { job.fn(); } catch (e) { console.error(e); } }
    // la siguiente, en otra tarea
    setTimeout(next, 0);
  };
  if (typeof requestIdleCallback === 'function') idleId = requestIdleCallback(run, { timeout: 1000 });
  // red de seguridad: con la pestaña oculta Chrome no entrega idle callbacks (ni su timeout)
  timer = window.setTimeout(run, 1500);
}

/** Encola fn para un período ocioso (de a una por tarea, en orden). Devuelve la cancelación. */
export function idleTask(fn: () => void): () => void {
  const job: Job = { fn, dead: false };
  queue.push(job);
  if (!pumping) { pumping = true; next(); }
  return () => { job.dead = true; };
}

type Target = Element | Element[] | NodeListOf<Element> | null | undefined;
const els = (t: Target): HTMLElement[] => (t ? (gsap.utils.toArray(t) as HTMLElement[]) : []);

/** gsap.set de varios grupos [targets, vars] con una sola pasada de lectura y otra de escritura. */
export function setBatch(jobs: Array<[Target, gsap.TweenVars]>) {
  // 0) GSAP, al parsear un elemento por primera vez, escribe translate/rotate/scale = none en línea (pliega las
  //    propiedades individuales en transform; acá ninguna sección las usa en CSS). Escritas antes, todas juntas, esas
  //    escrituras de GSAP quedan sin cambio y la pasada de lectura ya no ensucia el estilo entre elemento y elemento.
  for (const [t] of jobs) for (const el of els(t)) { const s = el.style; if (s.translate !== 'none') { s.translate = 'none'; s.rotate = 'none'; s.scale = 'none'; } }
  // 1) lecturas: GSAP parsea y cachea el transform de cada elemento (sólo la primera lectura recalcula estilo/layout)
  for (const [t] of jobs) for (const el of els(t)) gsap.getProperty(el, 'x');
  // 2) escrituras en línea de la opacidad final (así gsap.set no lee la computada)
  for (const [t, v] of jobs) {
    const o = v.opacity ?? v.autoAlpha;
    if (o == null) continue;
    for (const el of els(t)) el.style.opacity = String(o);
  }
  // 3) el set de siempre: ya no lee el DOM
  for (const [t, v] of jobs) { const e = els(t); if (e.length) gsap.set(e, v); }
}

/** Versiones clásicas (sin escena) de Stack, Experience y Contact: con la galería activa (data-gallery en su zona,
    lo pone hero-controller antes de que corran estos efectos) están ocultas y no hace falta armar sus animaciones
    de scroll en la carga (D-01). Se arman si la zona pierde data-gallery (sin GPU / estático); sin galería, ya. */
export function whenNoGallery(el: Element | null, fn: () => void): () => void {
  const zone = el ? el.closest('.transition-zone, .stack-zone, .fbf-zone') : null;
  if (!zone || !zone.hasAttribute('data-gallery')) { fn(); return () => {}; }
  const mo = new MutationObserver(() => { if (!zone.hasAttribute('data-gallery')) { mo.disconnect(); fn(); } });
  mo.observe(zone, { attributes: true, attributeFilter: ['data-gallery'] });
  return () => mo.disconnect();
}

/** Estado inicial (gsap.set en lote) de una sección lejana: ya, si está a la vista o cerca; si no, en lo primero que
    pase entre ensure() (su tarea ociosa) y un scroll (p. ej. la restauración del scroll al recargar a mitad de página).
    Lejos de la vista no se ve: el resultado es el mismo que hacerlo en el montaje, fuera de la hidratación (D-01). */
export function lazySet(section: Element, jobs: Array<[Target, gsap.TweenVars]>) {
  let done = false;
  const run = () => { if (done) return; done = true; removeEventListener('scroll', run); setBatch(jobs); };
  if (section.getBoundingClientRect().top < innerHeight * 2) run();
  else addEventListener('scroll', run, { passive: true });
  return { ensure: run, cancel: () => { done = true; removeEventListener('scroll', run); } };
}
