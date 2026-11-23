/* La marca de cada empresa en «Quiénes ya confiaron en mí» (sección de la home y /es/capacitaciones).
   Juan 2026-11-23: «Pone los iconos de las empresas, enlaces a sus sitios web». Con logo oficial en public/: el logo,
   monocromo claro (capacitaciones.css, .trust-mark), a la altura de las mayúsculas del Bebas de al lado; el nombre queda
   como alt. Sin logo: el nombre en Bebas, como antes. El tamaño lo da el font-size del contenedor (em). */

import type { Trust } from '../../content/capacitaciones';

export default function TrustMark({ t }: { t: Trust }) {
  if (!t.logo) return <span className="trust-mark is-name">{t.name}</span>;
  return (
    <span className="trust-mark is-logo" style={{ ['--k' as string]: t.logo.k ?? 1, ...(t.logo.km ? { ['--km' as string]: t.logo.km } : {}) }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG/PNG chico y estático, sin optimizar */}
      <img src={t.logo.src} width={t.logo.width} height={t.logo.height} alt={t.name} loading="lazy" decoding="async" />
    </span>
  );
}
