import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Navbar from '../../../components/layout/Navbar';
import LogoMark from '../../../components/layout/LogoMark';
import { CAPACITACIONES as C } from '../../../content/capacitaciones';
import { SOCIAL_LINKS } from '../../../lib/content';
import { jsonLdString, personRef } from '../../../lib/person';
import { urlFor } from '../../../lib/routes';
import '../../../components/sections/capacitaciones.css';

/* /es/capacitaciones (C1, Juan 2026-11-23: «Va C1»; maqueta /es/maqueta-c1/capacitaciones de bb71746).
   Mismo menú, tipografías y componentes que la home: arranca como sus secciones (rótulo + titular en dos líneas con la
   segunda en rojo), cruza la traza del hero y sigue con el índice numerado. Server component estático, sin la escena 3D.
   Solo ES: /en/capacitaciones* y /capacitaciones* redirigen acá (308, next.config.mjs).
   Los 7 programas no tienen página propia todavía: cada fila abre un mail «Capacitación: [programa]» (sin links a 404).
   Títulos y resúmenes de los programas: PROVISORIOS (content/capacitaciones.ts). */

export const dynamicParams = false;
export function generateStaticParams() {
  return [{ locale: 'es' }];
}

const URL_SELF = urlFor('es', C.path);
const pad2 = (n: number) => String(n).padStart(2, '0');
const mail = (subject: string) => `mailto:${SOCIAL_LINKS.email}?subject=${encodeURIComponent(subject)}`;
/* la traza del hero (static-trace en Hero.tsx / TRACE_D del menú), plana, viewBox 0 0 1000 120 */
const TRACE_D = 'M0 90 H340 l10 -6 l8 6 H372 l5 5 l9 -86 l9 96 l6 -15 H470 q22 -18 44 0 H1000';

export function generateMetadata(): Metadata {
  const { title, description } = C.meta;
  return {
    title,
    description,
    // ES sin par en EN: canonical propio y sin hreflang (el layout pone los de la home; acá se reemplazan enteros).
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

/* Service (con el catálogo de los 7 programas, sin url: no tienen página) + BreadcrumbList. El Person va en el layout
   (mismo @id). Sin precios ni ofertas con monto. */
function jsonLd() {
  const service = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${URL_SELF}#service`,
    name: C.h1,
    serviceType: 'Capacitación en inteligencia artificial para empresas',
    description: C.answer,
    url: URL_SELF,
    inLanguage: 'es',
    provider: personRef(),
    audience: { '@type': 'BusinessAudience', audienceType: 'Equipos de empresas' },
    areaServed: [
      { '@type': 'City', name: 'Córdoba', containedInPlace: { '@type': 'Country', name: 'Argentina' } },
      { '@type': 'Country', name: 'Argentina' },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: C.programsTitle,
      itemListElement: C.programs.map((p) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: p.title, description: p.summary, provider: personRef() },
      })),
    },
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: C.breadcrumb.home, item: urlFor('es', '') },
      { '@type': 'ListItem', position: 2, name: C.breadcrumb.self, item: URL_SELF },
    ],
  };
  return [service, breadcrumb];
}

export default async function CapacitacionesPage({ params: { locale } }: { params: { locale: string } }) {
  if (locale !== 'es') notFound();
  setRequestLocale(locale);
  const tc = await getTranslations({ locale, namespace: 'contact' });
  const home = '/es';

  return (
    <>
      {jsonLd().map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
      ))}
      <a href="#content" className="skip-link">Saltar al contenido</a>
      <Navbar page />
      <main id="content" className="cap cap-page">
        <header className="cap-open">
          <nav aria-label="Ruta" className="cap-crumb">
            <span className="cap-sq" aria-hidden="true" />
            <a href={home}>{C.breadcrumb.home}</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{C.breadcrumb.self}</span>
          </nav>
          {/* Juan 2026-11-23: la misma frase y el mismo corte que el titular de la sección de la home */}
          <h1 className="cap-title" aria-label={C.h1}>
            <span>Capacito equipos y empresas en</span>
            <span className="cap-red">automatización e</span>
            <span className="cap-red">inteligencia artificial</span>
          </h1>
          <div className="cap-trace" aria-hidden="true">
            <svg viewBox="0 0 1000 120" preserveAspectRatio="none" focusable="false">
              <path className="cap-trace-glow" d={TRACE_D} />
              <path d={TRACE_D} />
            </svg>
            <span className="cap-trace-dot" />
            <span className="cap-trace-ch"><i />{pad2(C.programs.length)} programas</span>
          </div>
          <div className="cap-open-foot">
            <p className="cap-lead">{C.answer}</p>
            <div className="cap-ctas">
              <a className="cap-btn cap-btn-solid" href={mail(C.cta.subject)}><span>{C.cta.label}</span></a>
              <a className="cap-btn cap-btn-ghost" href="#programas"><span>Ver programas</span><span aria-hidden="true">↓</span></a>
            </div>
          </div>
        </header>

        <section id="programas" className="cap-progs" aria-labelledby="cap-progs-h">
          <div className="cap-ghead">
            <h2 id="cap-progs-h" className="cap-label"><span className="cap-sq" aria-hidden="true" />{C.programsTitle}</h2>
            <span className="cap-meta"><b>{pad2(C.programs.length)}</b> programas</span>
          </div>
          <ol className="cap-list">
            {C.programs.map((p, i) => (
              <li key={p.slug} id={p.slug}>
                {/* sin página propia todavía: la fila abre el mail con el programa en el asunto */}
                <a className="cap-row" href={mail(`Capacitación: ${p.title}`)}>
                  <span className="cap-n">{pad2(i + 1)}</span>
                  <span className="cap-t">{p.title}</span>
                  <span className="cap-s">{p.summary}</span>
                  <span className="cap-a" aria-hidden="true">→</span>
                </a>
              </li>
            ))}
          </ol>
        </section>

        <section className="cap-who" aria-labelledby="cap-who-h">
          <div>
            <p className="cap-label" style={{ marginBottom: 22 }}><span className="cap-sq" aria-hidden="true" />{C.whoTitle}</p>
            <h2 id="cap-who-h" className="cap-title" aria-label="Enseño lo que uso para construir">
              <span>Enseño lo que uso</span>
              <span className="cap-red">para construir</span>
            </h2>
          </div>
          <div>
            {C.who.map((t, i) => <p key={i}>{i === 0 ? t.replace('Enseño lo que uso para construir. ', '') : t}</p>)}
            <div className="cap-ctas">
              <a className="cap-btn cap-btn-solid" href={mail(C.cta.subject)}><span>{C.cta.label}</span></a>
              <a className="cap-btn cap-btn-ghost" href={`${home}#experience`}><span>{C.trajectory.label}</span></a>
            </div>
          </div>
        </section>
      </main>

      {/* DF-02 (design-critic 2026-11-23): la página cierra con el pie del sitio, el mismo de la sección Contacto sin escena
          (Contact.tsx, .ctm-foot): logo, «Hecho con» y ©, con sus mismas clases. .cap da el fondo y el --pad de la página;
          abajo deja lugar para el dock del celular (56 px). */}
      <footer className="cap">
        <div className="mx-[var(--pad)] pb-24 lg:pb-12 border-t border-border pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <a href={home} aria-label={tc('logo_alt')} className="inline-flex h-7 text-white opacity-60 [&>svg]:h-full [&>svg]:w-auto">
            <LogoMark idSuffix="-foot-cap" />
          </a>
          <p className="font-mono text-xs text-muted hidden sm:block">{tc('built_with')}</p>
          <p className="font-mono text-xs text-muted">{tc('copyright')}</p>
        </div>
      </footer>
    </>
  );
}
