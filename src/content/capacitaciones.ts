/* Contenido de /es/capacitaciones (página pilar, solo ES). Fuente: clients/jpr-portfolio/contenido/
   2026-11-17-reposicionamiento/05-copy.md §3 y 03-mapa-de-paginas.md (tabla de programas).
   Decisiones de Juan aplicadas (2026-11-20, «Sí, defaults»): sin «No hace falta saber programar»; licitaciones como
   «todos los portales de compras públicas», sin número; CTA único «Escribime»; «TraumaVision AI» junto al nombre.
   PENDIENTE, NO se publica hasta que Juan lo dé: formato (in-company/remoto), formatos, temas, «Así es una jornada»,
   casos y FAQ (sin FAQPage). Los títulos y resúmenes de los 7 programas son PROVISORIOS (03-mapa) hasta que se escriba
   cada programa y Juan confirme cuáles da hoy. */

export type Program = {
  slug: string;
  title: string;
  summary: string;
  /** true solo si la página del programa existe (sin links a 404). */
  hasPage: boolean;
};

export const CAPACITACIONES = {
  path: '/capacitaciones',
  updated: '2026-11-20',
  meta: {
    // Juan 2026-11-23: nada de «Capacitación en IA para equipos»; en el title, la forma nominal de su frase
    title: 'Capacitación de equipos y empresas en automatización e IA | Juan Pablo Rojo',
    description:
      'Capacito equipos y empresas en automatización e inteligencia artificial: marketing, ventas, RR. HH., administración y salud, sobre las tareas reales del equipo. Desde Córdoba.',
  },
  breadcrumb: { home: 'Inicio', self: 'Capacitaciones' },
  h1: 'Capacito equipos y empresas en automatización e inteligencia artificial',
  /** Respuesta directa (05-copy §3), sin la oración del formato (PENDIENTE). */
  // Respuesta directa v2 (05-copy §3b, geo-seo-aeo M3, 2026-11-21): dice quién capacita y desde dónde, en tercera
  // persona, para que se sostenga citada sin la página. También es la `description` del Service.
  answer:
    'Juan Pablo Rojo da capacitaciones prácticas en inteligencia artificial a equipos de empresas desde Córdoba, Argentina: marketing, ventas, recursos humanos, administración, salud y dirección. No usa ejemplos de manual: trabaja sobre las tareas que el equipo hace todas las semanas, con sus documentos y sus herramientas. Inversión: la conversamos personalmente.',
  cta: {
    label: 'Escribime',
    subject: 'Capacitación en IA para mi equipo',
  },
  programsTitle: 'Programas por área',
  programs: [
    { slug: 'ia-para-marketing', title: 'IA para marketing', summary: 'Contenidos, campañas, análisis y briefs con IA, sobre el trabajo real del equipo.', hasPage: true },
    { slug: 'ia-para-ventas', title: 'IA para ventas', summary: 'Prospección, propuestas, seguimiento y WhatsApp con IA para equipos B2B.', hasPage: false },
    { slug: 'ia-para-recursos-humanos', title: 'IA para recursos humanos', summary: 'Búsquedas, onboarding, manuales y comunicación interna con IA, con cuidado de los datos personales.', hasPage: false },
    { slug: 'ia-para-lideres', title: 'IA para líderes', summary: 'Qué cambia la IA en el negocio, qué delegar, qué medir y cómo llevar al equipo.', hasPage: false },
    { slug: 'ia-para-administracion', title: 'IA para administración y finanzas', summary: 'Conciliaciones, reportes, documentos y planillas con IA; sección para estudios contables.', hasPage: false },
    { slug: 'ia-para-salud', title: 'IA en salud', summary: 'Para equipos de clínicas, hospitales y empresas de equipamiento médico: administración, gestión y biomédica, con criterio clínico.', hasPage: false },
    { slug: 'agentes-y-automatizacion', title: 'Agentes de IA y automatización', summary: 'Cómo construir agentes y automatizaciones con Claude, ChatGPT y herramientas no-code, con casos en producción.', hasPage: false },
  ] satisfies Program[],
  forWhomTitle: 'Para quién es',
  /** 05-copy §3 `for_whom`, sin «No hace falta saber programar.» (decisión de Juan). Una oración por renglón. */
  forWhom: [
    'Para equipos que ya usan ChatGPT, Claude o Gemini cada uno por su lado y quieren hacerlo con criterio común.',
    'Para áreas con tareas que se repiten (propuestas, reportes, contenidos, búsquedas, respuestas a clientes) y que todavía se hacen a mano.',
    'Y para responsables de área que necesitan decidir qué pasar a IA, qué no y cómo cuidar los datos de la empresa.',
  ],
  whoTitle: 'Quién enseña',
  /** 05-copy §3 `who_teaches`. LEEX: «todos los portales», sin número. TraumaVision AI. */
  who: [
    'Enseño lo que uso para construir. Mi estudio, Eleven, opera con un pipeline de agentes sobre Claude API. Para LEEX desarrollo un sistema que barre todos los portales de compras públicas y prepara borradores de veredicto para Ventas. Mi tesis, TraumaVision AI, es un detector de fracturas en radiografías de muñeca pediátrica.',
    'Lo que llega a una capacitación ya lo probé en ese trabajo. Soy capacitador en Academia Ícaro.',
  ],
  /** /sobre-mi todavía no existe: la trayectoria vive en la sección About de la home. */
  trajectory: { label: 'Ver mi trayectoria', href: '/es#about' },
  contactTitle: 'Contacto',
  updatedLabel: 'Actualizado el',
  updatedHuman: '20 de noviembre de 2026',
} as const;
