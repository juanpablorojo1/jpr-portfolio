import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import Navbar from '../../../components/layout/Navbar';
import RecursosFoot from '../../../components/sections/RecursosFoot';
import { RECURSOS, RECURSOS_PAGE as P, RECURSOS_PATH } from '../../../content/recursos';
import { getRecurso } from '../../../lib/recursos';
import { jsonLdString, personRef } from '../../../lib/person';
import { urlFor } from '../../../lib/routes';
import '../../../components/sections/capacitaciones.css';
import '../../../components/sections/recursos.css';

/* /es/recursos: el índice de las guías que manda el bot de @jrojo.ia (Juan 2026-11-24). Mismo menú, tipografías y
   componentes que /es/capacitaciones: rótulo, titular con la segunda línea en rojo, la traza del hero y el índice
   numerado con filetes (las filas son links). Solo ES: /en/recursos* y /recursos* redirigen acá (next.config.mjs). */

export const dynamicParams = false;
export function generateStaticParams() {
  return [{ locale: 'es' }];
}

const URL_SELF = urlFor('es', RECURSOS_PATH);
const pad2 = (n: number) => String(n).padStart(2, '0');
const TRACE_D = 'M0 90 H340 l10 -6 l8 6 H372 l5 5 l9 -86 l9 96 l6 -15 H470 q22 -18 44 0 H1000';

export function generateMetadata(): Metadata {
  const { title, description } = P.meta;
  return {
    title,
    description,
    alternates: { canonical: URL_SELF },
    openGraph: {
      title,
      description,
      url: URL_SELF,
      siteName: 'Juan Pablo Rojo',
      type: 'website',
      locale: 'es_AR',
      images: [{ url: '/og/og-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og/og-image.png'] },
  };
}

export default function RecursosPage({ params: { locale } }: { params: { locale: string } }) {
  if (locale !== 'es') notFound();
  setRequestLocale(locale);
  const items = RECURSOS.map((r) => getRecurso(r.slug)!);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${URL_SELF}#page`,
      name: P.h1,
      description: P.meta.description,
      url: URL_SELF,
      inLanguage: 'es',
      author: personRef(),
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: items.map((r, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: urlFor('es', `${RECURSOS_PATH}/${r.slug}`),
          name: r.title,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: P.breadcrumb.home, item: urlFor('es', '') },
        { '@type': 'ListItem', position: 2, name: P.breadcrumb.self, item: URL_SELF },
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
        <header className="cap-open">
          <nav aria-label="Ruta" className="cap-crumb">
            <span className="cap-sq" aria-hidden="true" />
            <a href="/es">{P.breadcrumb.home}</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{P.breadcrumb.self}</span>
          </nav>
          <h1 className="cap-title" aria-label={P.h1}>
            <span>Recursos para</span>
            <span className="cap-red">trabajar con IA</span>
          </h1>
          <div className="cap-trace" aria-hidden="true">
            <svg viewBox="0 0 1000 120" preserveAspectRatio="none" focusable="false">
              <path className="cap-trace-glow" d={TRACE_D} />
              <path d={TRACE_D} />
            </svg>
            <span className="cap-trace-dot" />
            <span className="cap-trace-ch"><i />{pad2(items.length)} guías</span>
          </div>
          <div className="cap-open-foot">
            <p className="cap-lead">{P.intro}</p>
          </div>
        </header>

        <section className="cap-progs rec-index" aria-labelledby="rec-list-h">
          <div className="cap-ghead">
            <h2 id="rec-list-h" className="cap-label"><span className="cap-sq" aria-hidden="true" />{P.listTitle}</h2>
            <span className="cap-meta"><b>{pad2(items.length)}</b> guías</span>
          </div>
          <ol className="cap-list">
            {items.map((r, i) => (
              <li key={r.slug}>
                <a className="cap-row" href={`/es${RECURSOS_PATH}/${r.slug}`}>
                  <span className="cap-n">{pad2(i + 1)}</span>
                  <h3 className="cap-t rec-t">
                    <span className="rec-word">{r.palabra}</span>
                    {r.title}
                  </h3>
                  <p className="cap-s">{r.resumen}</p>
                  <span className="cap-a" aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ol>
        </section>

        <RecursosFoot />
      </main>
    </>
  );
}
