import { getImageProps } from 'next/image';

/* El mismo <img> que next/image con `fill` (srcset, sizes, lazy), pero en < 1024 la fuente es un GIF en blanco de
   1 px en línea (2026-10-14, mobile-senal). Para imágenes que en el teléfono están ocultas (la foto del About, la tira
   del apilado de escritorio sin escena): Chrome igual pedía esas imágenes lazy bajo display: none apenas quedaban
   dentro de su distancia de precarga, y competían con el LCP del hero. En >= 1024 el resultado es idéntico. */
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export default function DeskOnlyImage({ src, alt, sizes, className }: { src: string; alt: string; sizes: string; className?: string }) {
  const { props } = getImageProps({ src, alt, sizes, fill: true, className });
  return (
    <picture>
      <source media="(max-width: 1023px)" srcSet={BLANK} />
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <img {...props} />
    </picture>
  );
}
