/* Contenido de /[locale]/proyectos/traumavision (caso de la tesis, ES + EN). Fuente: clients/jpr-portfolio/qa/2026-11-21/
   copywriting-critic.md §Versión final propuesta (07-copy-traumavision.md con W-01, W-02 y M-01…M-06 aplicados).
   Reglas de Juan: «Ingeniería Biomédica (UNC)», nunca «ingeniero», «AI engineer» ni «founder/fundador» referido a él;
   tesis entregada, defensa pendiente; cifras de la tesis (mAP50 0,944, sensibilidad 96,7 %, AUC 0,987; 97,4 % es del
   test externo); «TraumaVision AI» junto al nombre; ficha corta; CTA único «Escribime»; nada que explique cómo replicar
   el sistema (sin CLAHE, umbrales, hiperparámetros ni hardware).
   Defaults del dispatch (los confirma Juan): M-05 sin link a la tesis completa (queda como referencia) y M-04 los
   reconocimientos en `results.recognition`, fuera de la grilla de métricas.
   Medios: el video demo y las 5 capturas que ya publica el caso de la home (lib/content.ts); labels y alts copiados de
   messages projects.traumavision (shot_labels, shots_alt, demo_alt), sin cambios. */

import type { Locale } from '../lib/person';

const NBSP = ' ';

export const TRAUMAVISION_PATH = '/proyectos/traumavision';
/** Fechas del caso (Article: datePublished/dateModified; sitemap: routes.ts). */
export const TRAUMAVISION_DATES = { published: '2026-11-21', modified: '2026-11-21' } as const;

export type CaseStat = { value: string; label: string };
export type CaseShot = { label: string; alt: string };

export type TraumaVisionCopy = {
  meta: { title: string; description: string };
  breadcrumb: { home: string; parent: string; self: string };
  eyebrow: string;
  /** H1 en dos partes (el nombre y el qué). El texto del H1 = main + ': ' + sub. */
  h1: { main: string; sub: string };
  /** Tagline partida en sus dos oraciones. */
  tagline: readonly [string, string];
  /** Respuesta directa (tercera persona, citable). */
  answer: string;
  problem: { heading: string; text: string };
  built: { heading: string; items: readonly string[] };
  media: { demoAlt: string; shots: readonly CaseShot[]; shotsLabel: string };
  results: {
    heading: string;
    stats: readonly CaseStat[];
    recognition: string;
    /** El límite: el texto y la oración que cierra (en blanco). */
    limit: { text: string; close: string };
    scopeNote: string;
  };
  stack: { heading: string };
  role: { heading: string; text: string };
  date: { heading: string; text: string };
  sources: { heading: string; items: readonly string[] };
  cta: {
    heading: string;
    /** cta.text; en ES el tramo `link` lleva a /es/capacitaciones (enlazado interno). */
    text: { before: string; link?: string; linkNote?: string; after: string };
    button: string;
    subject: string;
  };
  updatedLabel: string;
  updatedHuman: string;
  updatedBy: string;
};

export const TRAUMAVISION: Record<Locale, TraumaVisionCopy> = {
  es: {
    meta: {
      title: 'TraumaVision AI: fracturas de muñeca e IA · Juan Pablo Rojo',
      description:
        'TraumaVision AI, tesis de Juan Pablo Rojo (Ingeniería Biomédica, UNC): marca posibles fracturas en radiografías de muñeca pediátrica. Prototipo académico.',
    },
    breadcrumb: { home: 'Inicio', parent: 'Proyectos', self: 'TraumaVision AI' },
    eyebrow: 'Caso · Tesis · UNC Córdoba · 2026',
    h1: { main: 'TraumaVision AI', sub: 'detección de fracturas de muñeca pediátrica' },
    tagline: ['El sistema marca.', 'El médico decide.'],
    answer:
      'TraumaVision AI es la tesis de Juan Pablo Rojo en Ingeniería Biomédica (UNC, Argentina; entregada, defensa pendiente): un sistema que marca posibles fracturas en radiografías de muñeca pediátrica para que un médico las confirme. Su detector YOLOv8m logró una sensibilidad de 96,7 % en el test interno (3.038 imágenes). Es un prototipo académico, no autorizado para uso clínico.',
    problem: {
      heading: 'El problema',
      text: 'La pregunta de la tesis: ¿puede un modelo señalar en una radiografía de muñeca pediátrica dónde podría haber una fractura, sin decidir por el médico?',
    },
    built: {
      heading: 'Qué hice',
      items: [
        'Entrené y evalué un modelo YOLOv8m con más de 20.000 radiografías de muñeca pediátrica, y lo probé con radiografías de otro país sin reentrenarlo.',
        'Armé la app web: carga del estudio (imagen o ZIP de DICOM), visor con la zona marcada, revisión del médico e informe PDF.',
      ],
    },
    media: {
      demoAlt:
        'Video demo de TraumaVision, sin sonido, 36 s: ingreso, carga del estudio (imagen individual o ZIP de DICOM), un resultado REVISAR con la zona marcada por YOLOv8m, el visor invertido con el puntaje por zona, la revisión del médico, el informe PDF, un caso negativo, el historial, el desempeño del modelo y el alcance y las limitaciones.',
      shotsLabel: 'Pantallas de la app',
      shots: [
        { label: 'REVISAR', alt: 'TraumaVision: resultado REVISAR, una zona marcada sobre el radio distal con un puntaje del detector de 0,83 y el aviso de confirmar con lectura médica' },
        { label: 'VISOR', alt: 'TraumaVision: visor con contraste invertido y realce, la barra de puntaje por detección y los atajos de teclado' },
        { label: 'SIN HALLAZGOS', alt: 'TraumaVision: resultado SIN HALLAZGOS, con el aviso de que no descarta fractura' },
        { label: 'HISTORIAL', alt: 'TraumaVision: historial de análisis, filtrable por resultado y modelo (164 análisis: 102 con hallazgos, 62 sin)' },
        { label: 'ACIERTO', alt: 'TraumaVision: acierto medido contra casos diagnosticados por un médico: detecta 0,967, descarta 0,931; 3 de cada 100 fracturas quedan sin marcar' },
      ],
    },
    results: {
      heading: 'Resultado',
      stats: [
        { value: `96,7${NBSP}% · 93,1${NBSP}%`, label: 'Sensibilidad · especificidad, test interno de 3.038 imágenes' },
        { value: '0,987', label: 'AUC-ROC, test interno' },
        { value: '0,944', label: 'mAP50 por caja, test interno' },
        { value: `97,4${NBSP}% · 88,3${NBSP}%`, label: 'Sensibilidad · especificidad con radiografías de otro país, sin reentrenar' },
      ],
      recognition: 'Reconocimientos: semifinalista en Emprende U 2026 y finalista en AI Founders Lab (Endeavor y AWS).',
      limit: {
        text: 'En el test interno, unas 3 de cada 100 radiografías con fractura quedaron sin marcar, y «sin hallazgos» no descarta una fractura.',
        close: 'Por eso decide el médico.',
      },
      scopeNote:
        'Prototipo académico (tesis entregada) evaluado con datos retrospectivos. No registrado ante la ANMAT ni autorizado para uso clínico.',
    },
    stack: { heading: 'Stack' },
    role: { heading: 'Mi rol', text: 'Autor de la tesis. Desarrollé el modelo, la API y la aplicación web.' },
    date: { heading: 'Fecha', text: '2026 · Tesis de grado, Ingeniería Biomédica, UNC Córdoba. Entregada, defensa pendiente.' },
    sources: {
      heading: 'Fuentes',
      items: [
        'Tesis de grado «TraumaVision AI», Ingeniería Biomédica, UNC, Córdoba, octubre de 2026. Cifras: tablas 7.7, 8.2 y 9.9.',
        'Datos de entrenamiento y test interno: GRAZPEDWRI-DX (Hospital Universitario de Graz, Austria; CC BY 4.0).',
        'Test externo: PediURF (Shenzhen, China).',
      ],
    },
    cta: {
      heading: 'La IA propone, una persona decide. También en tu equipo.',
      text: {
        before: 'Construyo sistemas con IA y ',
        link: 'capacito a equipos de empresas',
        after: ' para usarla en su trabajo, con una persona revisando lo que el sistema propone.',
      },
      button: 'Escribime',
      subject: 'Contacto desde el caso TraumaVision AI',
    },
    updatedLabel: 'Actualizado el',
    updatedHuman: '21 de noviembre de 2026',
    updatedBy: 'Juan Pablo Rojo',
  },
  en: {
    meta: {
      title: 'TraumaVision AI: wrist fracture detection · Juan Pablo Rojo',
      description:
        "TraumaVision AI, Juan Pablo Rojo's thesis (Biomedical Engineering, UNC): flags possible fractures on pediatric wrist X-rays. An academic prototype.",
    },
    breadcrumb: { home: 'Home', parent: 'Projects', self: 'TraumaVision AI' },
    eyebrow: 'Case Study · Thesis · UNC Córdoba · 2026',
    h1: { main: 'TraumaVision AI', sub: 'pediatric wrist fracture detection' },
    tagline: ['The system flags.', 'The physician decides.'],
    answer:
      "TraumaVision AI is Juan Pablo Rojo's Biomedical Engineering thesis at UNC, Argentina (submitted, defense pending): a system that flags possible fractures on pediatric wrist X-rays for a physician to confirm. Its YOLOv8m detector reached 96.7% sensitivity on the internal test set (3,038 images). It is an academic prototype, not authorized for clinical use.",
    problem: {
      heading: 'The problem',
      text: 'The thesis question: can a model point to where a fracture might be on a pediatric wrist X-ray, without deciding for the physician?',
    },
    built: {
      heading: 'What I built',
      items: [
        'Trained and evaluated a YOLOv8m model on 20,000+ pediatric wrist X-rays, then tested it on X-rays from another country without retraining.',
        'Built the web app: study upload (single image or DICOM ZIP), viewer with the flagged area, physician review and a PDF report.',
      ],
    },
    media: {
      demoAlt:
        'TraumaVision demo video, silent, 36 s: sign-in, study upload (single image or a DICOM ZIP), a REVIEW result with the zone marked by YOLOv8m, the inverted viewer with the score per zone, the physician review, the PDF report, a negative case, the history, model performance, and scope and limitations.',
      shotsLabel: 'App screens',
      shots: [
        { label: 'REVIEW', alt: 'TraumaVision: REVIEW result, a zone marked over the distal radius with a 0.83 detector score and the notice to confirm with a medical reading' },
        { label: 'VIEWER', alt: 'TraumaVision: viewer with inverted contrast and enhancement, the score bar per detection and the keyboard shortcuts' },
        { label: 'NO FINDINGS', alt: 'TraumaVision: NO FINDINGS result, with the notice that it does not rule out a fracture' },
        { label: 'HISTORY', alt: 'TraumaVision: analysis history, filterable by result and model (164 analyses: 102 with findings, 62 without)' },
        { label: 'ACCURACY', alt: 'TraumaVision: accuracy measured against physician-diagnosed cases: detects 0.967, rules out 0.931; 3 in 100 fractures go unmarked' },
      ],
    },
    results: {
      heading: 'Results',
      stats: [
        { value: '96.7% · 93.1%', label: 'Sensitivity · specificity, internal test set of 3,038 images' },
        { value: '0.987', label: 'AUC-ROC, internal test set' },
        { value: '0.944', label: 'Box mAP50, internal test set' },
        { value: '97.4% · 88.3%', label: 'Sensitivity · specificity on X-rays from another country, no retraining' },
      ],
      recognition: 'Recognition: Emprende U 2026 semifinalist and AI Founders Lab finalist (Endeavor and AWS).',
      limit: {
        text: 'On the internal test set, about 3 in 100 X-rays with a fracture went unflagged, and "no findings" does not rule out a fracture.',
        close: 'That is why the physician decides.',
      },
      scopeNote:
        'Academic prototype (thesis submitted) evaluated on retrospective data. Not registered with ANMAT or authorized for clinical use.',
    },
    stack: { heading: 'Stack' },
    role: { heading: 'My role', text: 'Thesis author. I built the model, the API and the web app.' },
    date: { heading: 'Date', text: '2026 · Undergraduate thesis, Biomedical Engineering, UNC Córdoba. Submitted, defense pending.' },
    sources: {
      heading: 'Sources',
      items: [
        '"TraumaVision AI" undergraduate thesis, Biomedical Engineering, UNC, Córdoba, October 2026. Figures: tables 7.7, 8.2 and 9.9.',
        'Training and internal test data: GRAZPEDWRI-DX (Graz University Hospital, Austria; CC BY 4.0).',
        'External test: PediURF (Shenzhen, China).',
      ],
    },
    cta: {
      heading: 'AI proposes, a person decides. On your team too.',
      // Capacitaciones existe solo en ES: el enlace va a /es/capacitaciones con hreflang="es" y la nota «in Spanish»
      // (la misma etiqueta que el camino de la home EN). Enlazado interno caso EN → pilar (geo-seo-aeo m3).
      text: {
        before: 'I build AI systems and ',
        link: 'train company teams',
        linkNote: ' (in Spanish)',
        after: ' to use AI in their work, with a person reviewing what the system proposes.',
      },
      button: 'Email me',
      subject: 'From the TraumaVision AI case study',
    },
    updatedLabel: 'Updated',
    updatedHuman: 'November 21, 2026',
    updatedBy: 'Juan Pablo Rojo',
  },
};
