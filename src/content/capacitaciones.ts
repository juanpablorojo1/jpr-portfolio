/* Capacitaciones: la sección de la home (/es) y la página /es/capacitaciones (solo ES).
   Fuente única: clients/jpr-portfolio/contenido/2026-11-23-capacitaciones-real.md (copy con hechos reales, cada uno con su
   fuente en la carpeta de capacitaciones de Juan). Reemplaza al contenido inventado anterior (programas y áreas que Juan
   no da, «Para quién es», «Inversión» y el «Quién enseña» con Eleven, LEEX y TraumaVision).
   Juan 2026-11-23: «Pone capacitaciones, de que son las capacitaciones, y quienes ya confiaron en mi para capacitar su
   empresa». No se agrega nada que no esté en el copy. */

export type Topic = {
  slug: string;
  title: string;
  /** una línea (sección de la home) */
  summary: string;
  /** el detalle (página) */
  detail: string;
};

export type Logo = {
  /** archivo en public/ (logo oficial, sin redibujar) */
  src: string;
  width: number;
  height: number;
  /** de dónde salió (para el registro) */
  source: string;
  /** factor de altura para igualar la altura óptica entre logos (1 = la altura base) */
  k?: number;
  /** el mismo factor por debajo de 1024 (columna única y ancha), si cambia */
  km?: number;
};

export type Trust = {
  slug: string;
  name: string;
  /** sitio oficial (Juan 2026-11-23: «enlaces a sus sitios web»); verificado con curl: 200 */
  url: string;
  /** cómo se muestra el link (dominio, sin protocolo) */
  domain: string;
  /** logo oficial; sin logo se muestra el nombre en Bebas */
  logo?: Logo;
  /** una línea (sección de la home) */
  line: string;
  /** el caso (página) */
  story: string;
};

export const CAPACITACIONES = {
  path: '/capacitaciones',
  updated: '2026-11-23',
  meta: {
    title: 'Capacitaciones en Claude y automatización | Juan Pablo Rojo',
    description:
      'Capacito equipos y empresas en Claude: Claude Code, planillas, PDFs, facturas, agentes y flujos. Fruitlosophy y Rufus ya confiaron. Docente en ICARO.',
  },
  breadcrumb: { home: 'Inicio', self: 'Capacitaciones' },
  label: 'Capacitaciones',
  /** Titular aprobado por Juan (2026-11-23), no se toca. */
  h1: 'Capacito equipos y empresas en automatización e inteligencia artificial',
  /** Bajada de la sección de la home. */
  lead:
    'Enseño a usar Claude (Claude Code, Cowork y la app de escritorio) a empresas, sobre todo pymes. Trabajamos sobre las tareas reales de tu equipo, en clases en vivo una vez por semana.',
  /** Intro de la página. */
  intro:
    'Doy capacitaciones en Claude (Claude Code, Cowork y la app de escritorio) a empresas, sobre todo pymes. Los ejemplos de clase se arman sobre el negocio de cada empresa, y cada persona practica con sus propias tareas. Enseño lo necesario para que después tu equipo arme sus propias automatizaciones.',
  cta: {
    label: 'Escribime',
    subject: 'Quiero capacitar a mi equipo',
  },
  more: { label: 'Ver más' },
  whoLine: 'Juan Pablo Rojo · docente en ICARO (UNC) y capacitador de empresas',

  topicsTitle: 'De qué son las capacitaciones',
  topics: [
    {
      slug: 'claude-code-desde-cero',
      title: 'Claude Code desde cero',
      summary: 'Cómo funciona, para qué sirve cada herramienta y cómo se arma un proyecto.',
      detail: 'Cómo funciona Claude Code, para qué sirve cada herramienta y cómo se crea un proyecto. Es la base de todo lo demás.',
    },
    {
      slug: 'planillas-pdfs-y-facturas',
      title: 'Planillas, PDFs y facturas',
      summary: 'Las tareas de todos los días: planillas, PDFs, facturas, remitos y stock.',
      detail: 'Lo que hoy se hace a mano todas las semanas: planillas, PDFs, facturas, remitos y stock. Se automatiza sobre los archivos con los que el equipo ya trabaja.',
    },
    {
      slug: 'conectar-tus-herramientas',
      title: 'Conectar tus herramientas',
      summary: 'Claude trabajando con Google Sheets y Gmail.',
      detail: 'Claude integrado con otras plataformas, como Google Sheets y Gmail, para que lea y arme la información donde ya está.',
    },
    {
      slug: 'agentes-y-flujos',
      title: 'Agentes y flujos',
      summary: 'Cómo se crea un agente y un flujo de trabajo.',
      detail: 'Cómo se crea un agente, cómo se arma un flujo de trabajo y cuándo conviene repartir una tarea entre varios agentes.',
    },
    {
      slug: 'pedidos-y-skills',
      title: 'Pedidos y skills',
      summary: 'Pedir con claridad, y guardar en una skill lo que pedís siempre igual.',
      detail: 'Lo que cambia el resultado no es la herramienta: es la claridad del pedido. Y lo que pedís siempre igual, lo guardás en una skill.',
    },
    {
      slug: 'datos-con-criterio',
      title: 'Datos con criterio',
      summary: 'La IA predice: vos validás lo que devuelve y elegís qué datos le das.',
      detail: 'La IA predice. Los conectores y la web le dan datos reales, y vos validás lo que devuelve y elegís qué le das.',
    },
  ] satisfies Topic[],

  howTitle: 'Cómo es una capacitación',
  /** strong + resto de la oración (la parte en negrita del copy va en strong) */
  how: [
    { strong: 'En vivo, una vez por semana.', rest: ' Yo muestro en clase; ustedes practican afuera.' },
    { strong: 'Una entrega entre clase y clase', rest: ', sobre el trabajo real de cada uno.' },
    { strong: 'Soporte para dudas', rest: ', personalizado, mientras dura el curso.' },
    { strong: 'Herramientas que quedan', rest: ', como agentes, para seguir usándolas después.' },
  ],

  trustTitle: 'Quiénes ya confiaron en mí',
  trustLink: 'Ver sitio',
  trust: [
    {
      slug: 'fruitlosophy',
      name: 'Fruitlosophy',
      url: 'https://fruitlosophy.com',
      domain: 'fruitlosophy.com',
      logo: {
        src: '/logos/clientes/fruitlosophy-logo-blanco.png',
        width: 1200,
        height: 180,
        source:
          'https://static.wixstatic.com/media/792d2f_ece02ef0d0b94735929091c0cc43b0b0~mv2.png (Fruitlosophy_Logo_Blanco.png de fruitlosophy.com; recortado a su caja y reducido a 1200 px)',
        k: 1.12,   // trazo fino y minúsculas: más alto que Rufus para pesar lo mismo
      },
      line: 'Claude Code para su equipo: planillas, PDFs, facturas, remitos y stock.',
      story:
        'Fruitlosophy lleva fruta y snacks a las oficinas de otras empresas. Capacité a su equipo en Claude Code para automatizar planillas, PDFs, facturas, remitos y stock. El objetivo: que cada uno sepa cómo funciona Claude Code, cómo se crea un proyecto, cómo se integra con Google Sheets y cómo se arma un agente y un flujo de trabajo.',
    },
    {
      slug: 'rufus',
      name: 'Rufus',
      url: 'https://rufusocial.com',
      domain: 'rufusocial.com',
      logo: {
        src: '/logos/clientes/rufus.svg',
        width: 119,
        height: 22,
        source: 'Documents/Capacitaciones/clientes/2026-11-gustavo-haas/anexos/rufus/rufus-logo.svg (SVG oficial, copiado)',
        k: 1,   // wordmark pesado en mayúsculas: la referencia
      },
      line: 'Claude para ventas y producto, finanzas y RR. HH., cada uno con sus tareas.',
      story:
        'Rufus es una agencia creativa. Capacité en Claude a personas de ventas y producto, finanzas y RR. HH., cada una con sus propias tareas y ejemplos armados sobre el negocio de la agencia.',
    },
    {
      slug: 'icaro-unc',
      name: 'ICARO (UNC)',
      url: 'https://icaro.org.ar/producto/ia-aplicada-automatizacion/',
      domain: 'icaro.org.ar',
      logo: {
        src: '/logos/clientes/icaro-unc.webp',
        width: 1002,
        height: 96,
        source:
          'https://icaro.org.ar/wp-content/uploads/2026/08/Logo-IcaroUNC-1024x110.png.webp (logo ICARO + UNC + FCEFyN de la página del curso; recortado a su caja)',
        k: 0.74,   // lockup de 10,4:1: más bajo para que su área quede pareja con los otros dos y entre en su columna
        km: 0.9,   // en el celular la columna es ancha: más alto, para que «unc» y «FCEFyN» se lean
      },
      line: 'Docente del curso «IA Aplicada y Automatización», para gente que no programa.',
      story:
        'Soy docente del curso «IA Aplicada y Automatización» de ICARO, de la UNC. Es un curso para gente que no programa: doy clases sobre conectores, búsqueda web con validación, privacidad, pedidos claros, archivos y dashboards, y skills.',
    },
  ] satisfies Trust[],

  whoTitle: 'Quién enseña',
  whoText:
    'Soy Juan Pablo Rojo. Capacito empresas en Claude y soy docente en ICARO (UNC). Yo enseño y ustedes deciden: en clase muestro, y la práctica la hace cada uno sobre su propio trabajo.',
  closing: 'Contame qué tareas se repiten en tu equipo y armamos la capacitación sobre eso.',

  /** JSON-LD Service (versión citable en tercera persona) y llms.txt, textuales del copy. */
  serviceType: 'Capacitación en automatización e inteligencia artificial con Claude para empresas',
  serviceDescription:
    'Juan Pablo Rojo capacita equipos de empresas, sobre todo pymes, en Claude (Claude Code, Cowork y la app de escritorio): proyectos, automatización de planillas, PDFs y facturas, conexión con Google Sheets y Gmail, agentes, flujos de trabajo y skills. Clases en vivo semanales con entregas entre clases y soporte para dudas. Capacitó a equipos de Fruitlosophy y Rufus, y es docente del curso «IA Aplicada y Automatización» de ICARO (UNC).',
  llms:
    'Juan Pablo Rojo capacita equipos y empresas en automatización e inteligencia artificial con Claude (Claude Code, Cowork y la app de escritorio): proyectos, planillas, PDFs y facturas, conexión con Google Sheets y Gmail, agentes, flujos de trabajo y skills. Clases en vivo semanales. Capacitó a equipos de Fruitlosophy y Rufus, y es docente del curso «IA Aplicada y Automatización» de ICARO (UNC). Solo en español.',
} as const;
