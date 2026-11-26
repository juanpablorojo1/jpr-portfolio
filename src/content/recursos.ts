/* Recursos (/es/recursos, solo ES): las guías que el bot de @jrojo.ia manda por DM cuando alguien comenta una palabra
   en un reel o carrusel. Juan 2026-11-24: «y si los recursos los ponemos en mi portafolio? asi me trae visitas, me da
   prestigio y tambien me da posicionamiento ... y que el bot pase esos links».
   Fuente única del texto: los .md del bot (Redes sociales Juampi/bot/recursos/), copiados textuales a
   src/content/recursos/ con `node scripts/sync-recursos.mjs <carpeta>`. No se reescribe nada acá.
   Solo las palabras aprobadas en el bot (data/keywords.json, estado «aprobada»). El orden es el de la lista: lo más
   nuevo arriba. `fecha` = día en que la página se publicó en este sitio. */

export type Recurso = {
  slug: string;
  /** la palabra que se comenta en Instagram */
  palabra: string;
  /** una línea (lista y meta description): la descripción aprobada de la palabra en el bot */
  resumen: string;
  fecha: string;
};

export const RECURSOS_PATH = '/recursos';

export const RECURSOS: readonly Recurso[] = [
  { slug: 'founder', resumen: 'La Founder Skill: once skills gratis de Claude que prueban tu negocio antes de lanzarlo, con un directorio que te pone nota y un panel de clientes simulados.', palabra: 'FOUNDER', fecha: '2026-11-26' },
  { slug: 'agente', resumen: 'Coucou, el compañero gratis y de código abierto para tus agentes de IA: aprobás los permisos de Claude Code desde la muesca o el celular.', palabra: 'AGENTE', fecha: '2026-11-26' },
  { slug: 'motion', resumen: 'Cómo hacer un reel animado con Claude Code y Remotion: qué instalar, los prompts para el personaje y las escenas, cómo pedir correcciones y música libre.', palabra: 'MOTION', fecha: '2026-11-24' },
  { slug: 'harvey', resumen: 'Sellbird (antes Harvey), el agente de Claude de código abierto que busca clientes y les escribe: qué hace, qué necesita y cómo instalarlo.', palabra: 'HARVEY', fecha: '2026-11-24' },
  { slug: 'mcp', resumen: 'Qué es una API y qué es MCP, explicado para un negocio, con preguntas para hacerle al proveedor.', palabra: 'MCP', fecha: '2026-11-24' },
  { slug: 'guia', resumen: 'Cómo conectar el WhatsApp oficial con Claude usando el servidor MCP de Meta (WhatsApp Business Tools).', palabra: 'GUIA', fecha: '2026-11-24' },
  { slug: 'video', resumen: 'Cómo se editó un video a cámara con Google Vids y Claude Code, con los prompts.', palabra: 'VIDEO', fecha: '2026-11-24' },
  { slug: 'repo', resumen: '9 repos de GitHub gratis en vez de software pago, con la letra chica de cada uno y preguntas para hacerse antes de instalar.', palabra: 'REPO', fecha: '2026-11-24' },
  { slug: 'finde', resumen: '5 proyectos con Claude para hacer un fin de semana, paso a paso, con prompts para copiar.', palabra: 'FINDE', fecha: '2026-11-24' },
  { slug: 'bot', resumen: 'Haiku 5.5, Sonnet 5.5 y Opus 5.5 para el bot de un consultorio: tabla de resultados, system prompt de prueba y cuánto sale cada uno por mes.', palabra: 'BOT', fecha: '2026-11-24' },
  { slug: 'claude-code', resumen: 'Guía corta para arrancar con Claude Code: instalación, primer proyecto, CLAUDE.md y cinco pedidos para probar.', palabra: 'CLAUDE', fecha: '2026-11-24' },
  { slug: 'cursos', resumen: '3 cursos gratis para arrancar con IA, sin programar: Elements of AI, Introducción a la IA generativa de Google y AI Fluency de Anthropic.', palabra: 'CURSOS', fecha: '2026-11-24' },
  { slug: 'prompt', resumen: 'El prompt exacto del experimento «el mismo prompt a 3 modelos» (la cítrica de gomita en 3D con WebGPU) y el link a los tres resultados.', palabra: 'PROMPT', fecha: '2026-11-24' },
];

export const RECURSOS_PAGE = {
  meta: {
    title: 'Recursos de IA: guías, prompts y herramientas | Juan Pablo Rojo',
    description:
      'Las guías que mando por Instagram (@jrojo.ia): Claude Code, MCP, agentes, Remotion, repos gratis y cursos, paso a paso y con los prompts para copiar.',
  },
  breadcrumb: { home: 'Inicio', self: 'Recursos' },
  h1: 'Recursos para trabajar con IA',
  intro:
    'Las guías que mando por mensaje cuando alguien comenta una palabra en @jrojo.ia. Paso a paso, con los links y los prompts para copiar.',
  listTitle: 'Todas las guías',
  llms: 'Guías prácticas para trabajar con IA (Claude Code, MCP, agentes, Remotion, repos gratis, cursos), con links y prompts.',
  /** cierre de cada recurso: lleva a capacitaciones */
  close: {
    title: ['Esto, en', 'tu equipo'],
    text: 'Capacito equipos y empresas en Claude y automatización, sobre las tareas reales de cada equipo.',
    training: 'Ver capacitaciones',
    write: 'Escribime',
    subject: 'Consulta desde los recursos',
    all: 'Todos los recursos',
  },
} as const;
