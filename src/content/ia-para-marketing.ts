/* Contenido de /es/capacitaciones/ia-para-marketing (primer programa, solo ES). Fuente: clients/jpr-portfolio/contenido/
   2026-11-17-reposicionamiento/05-copy.md §4 y 03-mapa-de-paginas.md (plantilla de programa).
   Decisiones de Juan aplicadas (2026-11-20, «Sí, defaults»): sin «no hace falta saber programar»; CTA único «Escribime».
   Fuera de «para quién es»: la oración de jornadas mixtas marketing + ventas (estaba a confirmar).
   PENDIENTE, NO se publica hasta que Juan lo dé: temario, formato y duración, FAQ del área (sin FAQPage), nombre de la
   agencia del caso (con permiso), resultados y testimonio. «Qué se lleva el equipo» es el formato propuesto en 05-copy;
   si Juan da otros entregables, se reemplazan acá. */

export const IA_PARA_MARKETING = {
  path: '/capacitaciones/ia-para-marketing',
  updated: '2026-11-21',
  updatedHuman: '21 de noviembre de 2026',
  meta: {
    title: 'IA para marketing: curso para equipos | Juan Pablo Rojo',
    description:
      'Capacitación en IA para equipos de marketing digital y agencias: contenidos, campañas, briefs y reportes, sobre el trabajo real del equipo.',
  },
  breadcrumb: { home: 'Inicio', parent: 'Capacitaciones', self: 'IA para marketing' },
  /** H1 de 05-copy §4. Se parte en dos renglones visuales; el texto del H1 queda igual. */
  h1: { main: 'IA para equipos de marketing', sub: 'capacitación práctica' },
  /** Nombre del programa (JSON-LD Course y migas). */
  name: 'IA para equipos de marketing',
  answer:
    'Es una capacitación en IA para equipos de marketing digital: contenidos, campañas, briefs y reportes, trabajados sobre las piezas reales del equipo. Vemos qué tareas conviene pasar a IA, cómo sostener la voz de la marca cuando escribe un modelo y cómo revisar lo que produce antes de publicar. Para equipos internos y agencias.',
  cta: { label: 'Escribime', subject: 'Capacitación en IA para el equipo de marketing' },

  forWhomTitle: 'Para quién es',
  /** 05-copy §4 `for_whom`, sin «no hace falta saber programar» ni la oración de jornadas mixtas. */
  forWhom: [
    'Para equipos de marketing de empresas y para agencias que producen contenido, campañas y reportes para varias marcas a la vez.',
    'Sirve a quien escribe, a quien diseña y a quien mide.',
  ],

  problemTitle: 'El problema del área',
  /** 05-copy §4 `problem`: las dos primeras oraciones como texto y la tercera como tesis destacada. */
  problem: [
    'En marketing, la IA ya se usa sin que nadie lo haya decidido: cada persona usa una herramienta distinta, con prompts propios y sin un criterio común.',
    'El resultado son textos que suenan genéricos, una voz de marca que cambia según quién escribió el prompt y piezas que nadie revisó contra los datos.',
  ],
  thesis: 'El trabajo no es usar más IA: es decidir dónde entra, con qué instrucciones y quién la revisa.',

  takeawaysTitle: 'Qué se lleva el equipo',
  /** 05-copy §4 `takeaways`, cada uno partido en lo que es y su detalle (mismas palabras). Sin la nota a confirmar. */
  takeaways: [
    { title: 'Un mapa de sus propias tareas', detail: 'Cuáles pasar a IA, cuáles no y por qué.' },
    { title: 'Instrucciones de marca escritas para la IA', detail: 'Voz, tono y palabras que no se usan, armadas sobre sus piezas reales.' },
    { title: 'Prompts y flujos para las tareas que más se repiten', detail: 'Contenidos, variantes de anuncios, briefs y reportes, probados en la jornada.' },
    { title: 'Un criterio de revisión', detail: 'Qué chequear antes de publicar algo que escribió un modelo.' },
  ],

  caseTitle: 'Caso relacionado',
  /** Anonimizado hasta tener nombre y permiso. Sin resultados ni testimonio (05-copy §4). */
  caseLabel: 'Una agencia de marketing',
  caseText: 'Capacité al equipo de una agencia de marketing. Este programa sale de esa capacitación.',

  relatedTitle: 'Seguí leyendo',
  /** Título y ruta de la pilar salen de content/capacitaciones.ts; ventas, de su lista de programas (sin página todavía:
      va como texto, sin link). */
  pillarSummary: 'Los programas por área, para quién es cada uno y quién enseña.',
  relatedSlugs: ['ia-para-ventas'],

  contactTitle: 'Contacto',
  updatedLabel: 'Actualizado el',
} as const;
