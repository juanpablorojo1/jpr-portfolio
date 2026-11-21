import { SITE_URL } from './site';
import { SOCIAL_LINKS } from './content';

/* Persona: los datos de Juan en una sola fuente (fase C del reposicionamiento, 2026-11-20).
   Alimenta el JSON-LD Person del layout ([locale]/layout.tsx), el provider de los Service/Course de las rutas nuevas,
   llms.txt y, cuando exista, /sobre-mi. No depende de messages/*.json: el hero y los títulos pueden cambiar sin tocarla.

   Reglas de Juan (no negociables):
   - «no quiero que diga AI engineer FOUNDER. ES VENDER HUMO NO TENGO UN TITULO!» → formación = «Ingeniería Biomédica
     (UNC)», tesis entregada y defensa pendiente. Nunca jobTitle «ingeniero», «engineer», «AI engineer» ni «founder».
     Por eso el Person NO lleva jobTitle: la formación va en disambiguatingDescription + alumniOf.
   - TraumaVision siempre como «TraumaVision AI» (06-panel-geo A5: hay un homónimo de Swemac).
   Fuente de la descripción: 05-copy.md §1, respuesta directa «¿Quién es Juan Pablo Rojo?». */

export type Locale = 'es' | 'en';

export const PERSON_ID = `${SITE_URL}/#person`;
/** Una sola URL para el Person en todo el JSON-LD (layout y provider/author/creator): la home ES, que responde 200.
    La raíz hace 307 por Accept-Language, por eso no se usa (geo-seo-aeo m2, 2026-11-21). Cuando exista /es/sobre-mi, va esa. */
export const PERSON_URL = `${SITE_URL}/es`;

export const PERSON = {
  name: 'Juan Pablo Rojo',
  givenName: 'Juan Pablo',
  familyName: 'Rojo',
  email: SOCIAL_LINKS.email,
  /** Perfiles propios que ya enlaza el sitio (Contacto). Academia Ícaro se suma cuando exista la URL de su ficha. */
  sameAs: [SOCIAL_LINKS.linkedin, SOCIAL_LINKS.github] as string[],
  education: {
    es: 'Ingeniería Biomédica (UNC)',
    en: 'Biomedical Engineering (UNC)',
  },
  university: {
    name: 'Universidad Nacional de Córdoba',
    url: 'https://www.unc.edu.ar',
  },
  /** Academia Ícaro: Juan es capacitador ahí (el nombre lo dio Juan en el brief del 2026-11-17).
      Sin `url` hasta que Juan confirme que es icaro.org.ar (lo dedujo el panel GEO; geo-seo-aeo M2, 2026-11-21). */
  affiliation: {
    name: 'Academia Ícaro',
  },
  homeLocation: {
    es: 'Córdoba, Argentina',
    en: 'Córdoba, Argentina',
  },
  /** 05-copy.md §1 (55 palabras). Tercera persona a propósito: es la frase que cita un buscador o una IA. */
  description: {
    es: 'Juan Pablo Rojo construye sistemas de IA aplicada y capacita a equipos de empresas para usar la IA en su trabajo. Estudió Ingeniería Biomédica en la UNC (tesis entregada, defensa pendiente), donde desarrolló TraumaVision AI, un detector de fracturas en radiografías pediátricas. Vive en Córdoba, Argentina, fundó el estudio Eleven y es capacitador en Academia Ícaro.',
    en: 'Juan Pablo Rojo builds applied AI systems and trains company teams to use AI in their work. He studied Biomedical Engineering at UNC, Argentina (thesis submitted, defense pending), where he built TraumaVision AI, a fracture detector for pediatric X-rays. He is based in Córdoba, Argentina, founded the studio Eleven and is an instructor at Academia Ícaro.',
  },
  /** Línea corta de entidad (la misma idea que la bio pedida a Ícaro en 06-panel-geo A1). */
  tagline: {
    es: 'Ingeniería Biomédica (UNC) · IA aplicada y capacitación para equipos de empresas',
    en: 'Biomedical Engineering (UNC) · Applied AI and training for company teams',
  },
  knowsAbout: {
    es: [
      'Inteligencia artificial aplicada',
      'Capacitación en IA para empresas',
      'Agentes de IA',
      'Automatización con IA',
      'Visión por computadora',
      'IA en diagnóstico por imágenes',
      'Ingeniería biomédica',
    ],
    en: [
      'Applied artificial intelligence',
      'AI training for companies',
      'AI agents',
      'AI automation',
      'Computer vision',
      'AI in medical imaging',
      'Biomedical engineering',
    ],
  },
} as const;

/** JSON-LD Person completo (va una vez por página, en el layout de [locale]). */
export function personJsonLd(locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': PERSON_ID,
    name: PERSON.name,
    givenName: PERSON.givenName,
    familyName: PERSON.familyName,
    url: PERSON_URL,
    image: `${SITE_URL}/og/og-image.png`,
    description: PERSON.description[locale],
    disambiguatingDescription: PERSON.tagline[locale],
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: PERSON.university.name,
      url: PERSON.university.url,
    },
    affiliation: {
      '@type': 'EducationalOrganization',
      name: PERSON.affiliation.name,
    },
    homeLocation: { '@type': 'Place', name: PERSON.homeLocation[locale] },
    knowsAbout: [...PERSON.knowsAbout[locale]],
    knowsLanguage: ['es', 'en'],
    sameAs: PERSON.sameAs,
  };
}

/** Referencia corta al Person (provider/author de Service, Course y Article): mismo @id que el del layout. */
export function personRef() {
  return { '@type': 'Person', '@id': PERSON_ID, name: PERSON.name, url: PERSON_URL };
}

/** Serializa JSON-LD para <script type="application/ld+json"> sin permitir cerrar la etiqueta. */
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
