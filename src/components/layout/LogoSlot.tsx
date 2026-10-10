'use client';

/* Slot del logo del menú. Aislado a propósito: el logo final todavía no está elegido
   (logo-generator, conceptos en clients/jpr-portfolio/logo/2026-10-10-conceptos/{a,b,c}/nav.svg).
   Para montar un concepto sin tocar el resto del menú:
     - inline (preferido: permite animar el trazo después):  <LogoSlot svg={<svg viewBox=…>…</svg>} />
     - archivo en /public:                                   <LogoSlot src="/logo/nav.svg" />
   El slot fija el ALTO (--logo-h en navbar.css: 24px desktop, 22px celular) y el ancho sale del viewBox.
   Sin svg ni src se ve el placeholder neutro «JPR» en mono. */

import type { ReactNode, MouseEvent } from 'react';

type Props = {
  /** SVG inline del logo. Debe traer viewBox; el slot lo escala por alto. */
  svg?: ReactNode;
  /** Alternativa: URL de un SVG servido desde /public. */
  src?: string;
  /** Nombre accesible del link (el SVG queda aria-hidden). */
  label: string;
  href: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
};

export default function LogoSlot({ svg, src, label, href, onClick }: Props) {
  let mark: ReactNode;
  if (svg) {
    mark = <span className="jnav-logo-mark" aria-hidden="true">{svg}</span>;
  } else if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    mark = <img className="jnav-logo-mark" src={src} alt="" aria-hidden="true" />;
  } else {
    mark = <span className="jnav-logo-ph" aria-hidden="true">JPR</span>;
  }

  return (
    <a className="jnav-logo" href={href} aria-label={label} onClick={onClick}>
      {mark}
    </a>
  );
}
