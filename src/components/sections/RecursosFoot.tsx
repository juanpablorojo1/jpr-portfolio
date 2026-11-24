import { getTranslations } from 'next-intl/server';
import LogoMark from '../layout/LogoMark';
import { RECURSOS_PAGE as P, RECURSOS_PATH } from '../../content/recursos';
import { CAPACITACIONES } from '../../content/capacitaciones';
import { SOCIAL_LINKS } from '../../lib/content';

/* Cierre de /es/recursos y de cada guía: lleva a Capacitaciones (el objetivo del Instagram: equipos y pymes para
   capacitar) y al mail. Mismo bloque que «Quién enseña» de /es/capacitaciones y el mismo pie del sitio. */
export default async function RecursosFoot({ current }: { current?: string }) {
  const tc = await getTranslations({ locale: 'es', namespace: 'contact' });
  const mailto = `mailto:${SOCIAL_LINKS.email}?subject=${encodeURIComponent(P.close.subject)}`;
  return (
    <>
      <section className="cap-who rec-close" aria-labelledby="rec-close-h">
        <div>
          <h2 id="rec-close-h" className="cap-title" aria-label={P.close.title.join(' ')}>
            <span>{P.close.title[0]}</span>
            <span className="cap-red">{P.close.title[1]}</span>
          </h2>
        </div>
        <div>
          <p>{P.close.text}</p>
          <div className="cap-ctas">
            <a className="cap-btn cap-btn-solid" href={`/es${CAPACITACIONES.path}`}><span>{P.close.training}</span></a>
            <a className="cap-btn cap-btn-ghost" href={mailto}><span>{P.close.write}</span></a>
          </div>
          {current && (
            <a className="cap-trust-link rec-all" href={`/es${RECURSOS_PATH}`}>
              <span aria-hidden="true">←</span><span>{P.close.all}</span>
            </a>
          )}
        </div>
      </section>
      <footer>
        <div className="mx-[var(--pad)] pb-24 lg:pb-12 border-t border-border pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <a href="/es" aria-label={tc('logo_alt')} className="inline-flex h-7 text-white opacity-60 [&>svg]:h-full [&>svg]:w-auto">
            <LogoMark idSuffix="-foot-rec" />
          </a>
          <p className="font-mono text-xs text-muted hidden sm:block">{tc('built_with')}</p>
          <p className="font-mono text-xs text-muted">{tc('copyright')}</p>
        </div>
      </footer>
    </>
  );
}
