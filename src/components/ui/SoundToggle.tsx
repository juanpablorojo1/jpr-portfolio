'use client';

/* Interruptor de sonido del sitio (src/lib/sound.ts). Apagado por defecto; un solo botón para todas las secciones.
   Aparece desde Projects (en el hero y el About no hay nada que suene y no se toca su composición aprobada).
   Solo escritorio ≥1024 y sin reduced motion (sound-toggle.css). Nombre accesible fijo + aria-pressed.
   D-02: con los controles del Tambor en cuadro (html.fv-drum-ui, VideosStage.tsx) se retira con un fundido: inert (ni
   clic, ni foco, ni árbol de accesibilidad) desde el primer instante; al salir del Tambor vuelve con su estado. */

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { onSound, restoreSound, setSound } from '../../lib/sound';
import './sound-toggle.css';

export default function SoundToggle() {
  const t = useTranslations('sound');
  const [on, setOn] = useState(false);
  const [shown, setShown] = useState(false);
  const [ducked, setDucked] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOn(restoreSound());
    const off = onSound(setOn);
    // visible desde que Projects entra en pantalla, y en todo lo que sigue
    const target = document.getElementById('projects');
    let io: IntersectionObserver | null = null;
    if (target && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(([e]) => {
        setShown(e.isIntersecting || e.boundingClientRect.top < 0);
      }, { threshold: 0 });
      io.observe(target);
    } else setShown(true);
    // D-02: el Tambor avisa con html.fv-drum-ui mientras sus controles están en cuadro
    const html = document.documentElement;
    const syncDuck = () => setDucked(html.classList.contains('fv-drum-ui'));
    syncDuck();
    const mo = new MutationObserver(syncDuck);
    mo.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => { off(); io?.disconnect(); mo.disconnect(); };
  }, []);

  // escondido: fuera del orden de tabulación (si tenía el foco, lo suelta); retirado por el Tambor, además inert
  const hidden = !shown || ducked;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.inert = ducked;
    if (hidden && document.activeElement === el) el.blur();
  }, [hidden, ducked]);

  return (
    <button
      ref={ref}
      type="button"
      className="snd-toggle"
      data-shown={shown ? '' : undefined}
      aria-pressed={on}
      aria-label={t('aria')}
      tabIndex={hidden ? -1 : 0}
      onClick={() => setSound(!on)}
    >
      <span className="snd-ico" aria-hidden="true"><i /><i /><i /></span>
      <span className="snd-t" aria-hidden="true">{t('label')} <b>{on ? t('on') : t('off')}</b></span>
    </button>
  );
}
