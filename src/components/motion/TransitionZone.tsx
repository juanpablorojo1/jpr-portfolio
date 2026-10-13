'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import type { SectionId } from '../../lib/transitionConfig';

const AnchorWord = dynamic(() => import('./AnchorWord'), { ssr: false });
const ConnectingLine = dynamic(() => import('./ConnectingLine'), { ssr: false });

interface Props {
  sectionId: SectionId;
  zIndex: number;
  children: ReactNode;
  overflowClip?: boolean;
  /** false: sin palabra de fondo ni línea conectora (About «Señal»: entra transparente sobre la escena 3D,
      y el mix-blend-mode de la palabra sobre el canvas WebGPU cuesta fps). */
  decor?: boolean;
}

// Card-stack wrapper. Sticky section with anchor word watermark + connecting line.
// Replaces raw sticky divs in page.tsx so transitions live with the section.

export default function TransitionZone({
  sectionId,
  zIndex,
  children,
  overflowClip = false,
  decor = true,
}: Props) {
  const hasAnchor = decor && sectionId !== 'hero';

  return (
    <div
      className="transition-zone"
      data-section={sectionId}
      // data-gallery lo pone GALLERY_SCRIPT (page.tsx) antes de hidratar, a propósito (layout sin salto): no es un desajuste
      suppressHydrationWarning
      style={{
        position: 'sticky',
        top: 0,
        zIndex,
        overflow: overflowClip ? 'clip' : 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}
    >
      {hasAnchor && <AnchorWord sectionId={sectionId as Exclude<SectionId, 'hero'>} />}
      {hasAnchor && <ConnectingLine />}
      <div style={{ position: 'relative', zIndex: 2 }}>{children}</div>
    </div>
  );
}
