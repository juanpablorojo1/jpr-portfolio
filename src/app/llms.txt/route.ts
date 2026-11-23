import { PERSON } from '../../lib/person';
import { SOCIAL_LINKS } from '../../lib/content';
import { urlFor } from '../../lib/routes';
import { SITE_URL } from '../../lib/site';
import { CAPACITACIONES } from '../../content/capacitaciones';

/* /llms.txt (llmstxt.org): quién es Juan y las URLs clave, en texto plano para las IAs. Estático: se arma en el build
   desde lib/person.ts y lib/routes.ts. El middleware no lo toca (su matcher excluye las rutas con punto). */
export const dynamic = 'force-static';

// Capacitaciones (/es/capacitaciones, solo ES) desde C1 (2026-11-23). IA para marketing y el caso TraumaVision AI se
// suman a «Páginas principales» cuando existan sus páginas (lib/routes.ts): sin links a 404.
export function GET() {
  const body = `# Juan Pablo Rojo

> ${PERSON.description.es}

${PERSON.tagline.es}. Sitio en español e inglés.

- Formación: Ingeniería Biomédica en la ${PERSON.university.name} (UNC); tesis entregada, defensa pendiente.
- Tesis: TraumaVision AI, detector de fracturas en radiografías de muñeca pediátrica (prototipo académico, no registrado ante la ANMAT). Test interno de la tesis: mAP50 0,944, sensibilidad 96,7 %, AUC-ROC 0,987.
- Ubicación: ${PERSON.homeLocation.es}.
- Contacto: ${SOCIAL_LINKS.email}

## Páginas principales

- [Inicio (español)](${urlFor('es', '')}): quién es, capacitaciones, proyectos, videos, stack, experiencia y contacto.
- [Home (English)](${urlFor('en', '')}): the same site in English.
- [Capacitación en IA para empresas](${urlFor('es', CAPACITACIONES.path)}): capacitaciones prácticas en IA para equipos de empresas (marketing, ventas, recursos humanos, administración, salud y dirección), con los ${CAPACITACIONES.programs.length} programas por área. Solo en español.

## Perfiles

- [LinkedIn](${SOCIAL_LINKS.linkedin})
- [GitHub](${SOCIAL_LINKS.github})

## Opcional

- [Sitemap](${SITE_URL}/sitemap.xml)
- [CV en español (PDF)](${SITE_URL}/CV_Juan_Pablo_Rojo_ES.pdf)
- [CV in English (PDF)](${SITE_URL}/CV_Juan_Pablo_Rojo_EN.pdf)
`;
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
