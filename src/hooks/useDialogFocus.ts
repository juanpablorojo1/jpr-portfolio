'use client';

import { useEffect, useRef } from 'react';

/* Foco de un visor modal (TraumaVision / Eleven, functional-tester F-02): al abrir, el foco va a Cerrar; Tab y
   Shift+Tab ciclan dentro del visor; al cerrar (Esc, botón o clic afuera) vuelve al botón que lo abrió.
   Esc y flechas siguen en el handler de cada visor. El trap del caso abierto (ProjectsGallery) cede mientras
   haya otro [aria-modal] en el documento. */
export function useDialogFocus<D extends HTMLElement = HTMLDivElement, C extends HTMLElement = HTMLButtonElement>(
  open: boolean,
) {
  const dialogRef = useRef<D>(null);
  const closeRef = useRef<C>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      const dialog = dialogRef.current;
      if (e.key !== 'Tab' || !dialog) return;
      const f = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
        .filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = !!active && dialog.contains(active);
      if (e.shiftKey && (active === first || !inside)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (active === last || !inside)) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      if (opener && opener !== document.body && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [open]);

  return { dialogRef, closeRef };
}
