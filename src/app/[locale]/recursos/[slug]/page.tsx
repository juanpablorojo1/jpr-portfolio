import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import Navbar from '../../../../components/layout/Navbar';
import RecursosFoot from '../../../../components/sections/RecursosFoot';
import { RECURSOS, RECURSOS_PAGE as P, RECURSOS_PATH } from '../../../../content/recursos';
import { getRecurso } from '../../../../lib/recursos';
import { jsonLdString, personRef } from '../../../../lib/person';
import { urlFor } from '../../../../lib/routes';
import { SITE_URL } from '../../../../lib/site';
import '../../../../components/sections/capacitaciones.css';
import '../../../../components/sections/recursos.css';

/* /es/recursos/<slug>: una guía. Arranca como /es/capacitaciones (ruta, titular en Bebas, la traza del hero), sigue con
   el texto del recurso (textual del bot) en una columna de lectura y cierra llevando a Capacitaciones. */

export const dynamicParams = false;
export function generateStaticParams() {
  return RECURSOS.map((r) => ({ locale: 'es', slug: r.slug }));
}

type Params = { params: { locale: string; slug: string } };

export function generateMetadata({ params: { slug } }: Params): Metadata {
  const r = getRecurso(slug);
  if (!r) return {};
  const url = urlFor('es', `${RECURSOS_PATH}/${slug}`);
  const title = `${r.title} | Juan Pablo Rojo`;
  return {
    title,
    description: r.resumen,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: r.resumen,
      url,
      siteName: 'Juan Pablo Rojo',
      type: 'article',
      locale: 'es_AR',
      images: [{ url: '/og/og-image.png', width: 1200, height: 630, alt: r.title }],
    },
    twitter: { card: 'summary_large_image', title, description: r.resumen, images: ['/og/og-image.png'] },
  };
}

const TRACE_D = 'M0 90 H340 l10 -6 l8 6 H372 l5 5 l9 -86 l9 96 l6 -15 H470 q22 -18 44 0 H1000';

export default function RecursoPage({ params: { locale, slug } }: Params) {
  if (locale !== 'es') notFound();
  setRequestLocale(locale);
  const r = getRecurso(slug);
  if (!r) notFound();
  const url = urlFor('es', `${RECURSOS_PATH}/${slug}`);
  const idx = RECURSOS.findIndex((x) => x.slug === slug);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      '@id': `${url}#article`,
      headline: r.title,
      description: r.resumen,
      url,
      mainEntityOfPage: url,
      inLanguage: 'es',
      datePublished: r.fecha,
      dateModified: r.fecha,
      author: personRef(),
      publisher: personRef(),
      image: `${SITE_URL}/og/og-image.png`,
      isPartOf: { '@type': 'CollectionPage', '@id': `${urlFor('es', RECURSOS_PATH)}#page` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: P.breadcrumb.home, item: urlFor('es', '') },
        { '@type': 'ListItem', position: 2, name: P.breadcrumb.self, item: urlFor('es', RECURSOS_PATH) },
        { '@type': 'ListItem', position: 3, name: r.title, item: url },
      ],
    },
  ];

  return (
    <>
      {jsonLd.map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
      ))}
      <a href="#content" className="skip-link">Saltar al contenido</a>
      <Navbar page="recursos" />
      <main id="content" className="cap cap-page">
        <header className="cap-open rec-open">
          <nav aria-label="Ruta" className="cap-crumb">
            <span className="cap-sq" aria-hidden="true" />
            <a href="/es">{P.breadcrumb.home}</a>
            <span aria-hidden="true">/</span>
            <a href={`/es${RECURSOS_PATH}`}>{P.breadcrumb.self}</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{r.palabra}</span>
          </nav>
          <h1 className="cap-title rec-title">{r.title}</h1>
          <div className="cap-trace" aria-hidden="true">
            <svg viewBox="0 0 1000 120" preserveAspectRatio="none" focusable="false">
              <path className="cap-trace-glow" d={TRACE_D} />
              <path d={TRACE_D} />
            </svg>
            <span className="cap-trace-dot" />
            <span className="cap-trace-ch"><i />Guía {String(idx + 1).padStart(2, '0')} · Palabra {r.palabra}</span>
          </div>
          <p className="cap-lead">{r.resumen}</p>
        </header>

        <article className="rec-prose" dangerouslySetInnerHTML={{ __html: r.html }} />

        <RecursosFoot current={slug} />
      </main>
    </>
  );
}
