'use client';

import { useTranslations } from 'next-intl';
import Navbar from '../../components/layout/Navbar';
import Hero from '../../components/sections/Hero';
import About from '../../components/sections/About';
import Projects from '../../components/sections/Projects';
import Videos from '../../components/sections/Videos';
import Skills from '../../components/sections/Skills';
import Experience from '../../components/sections/Experience';
import Contact from '../../components/sections/Contact';
import TransitionZone from '../../components/motion/TransitionZone';
import SoundToggle from '../../components/ui/SoundToggle';

// Corre mientras se parsea el HTML, antes del primer pintado: en escritorio con la escena posible (≥1024, sin reduced
// motion ni ?static) las secciones de la galería ya llevan data-gallery, la misma decisión que toma hero-controller al
// hidratar (syncSeeThrough). Así el primer layout ya es el de la galería y la hidratación no rehace el de toda la página
// (delivery-auditor D-01). Si después la escena no puede (sin GPU), hero-controller lo saca como siempre.
// Contact queda afuera: su capa del punto es fixed y se vería sobre el hero hasta que ContactStage la apaga al hidratar.
const GALLERY_SCRIPT = `(function(){if(!matchMedia('(min-width: 1024px)').matches||matchMedia('(prefers-reduced-motion: reduce)').matches||/[?&]static\\b/.test(location.search))return;['.transition-zone[data-section="projects"]','.fbf-zone','.stack-zone','.transition-zone[data-section="experience"]'].forEach(function(s){var z=document.querySelector(s);if(z)z.setAttribute('data-gallery','');});})();`;

export default function HomePage() {
  const t = useTranslations('nav');
  return (
    <>
      {/* Saltar al contenido (F-04): primer tabulable, invisible hasta recibir foco (globals.css .skip-link) */}
      <a href="#content" className="skip-link">{t('skip_to_content')}</a>
      {/* Sin loading screen: el hero «Señal» es el intro (un latido en la oscuridad) y se ve desde el primer frame. */}
      <Navbar />
      <main id="content" tabIndex={-1}>

        {/* Card stack with cinematic transitions —
            each section sticks, gets a watermark anchor word + connecting line,
            covered by the next as the user scrolls. */}
        <TransitionZone sectionId="hero" zIndex={10}>
          <Hero />
        </TransitionZone>

        {/* About «Señal»: sin decoración del card stack; con la escena viva entra transparente (hero-controller) */}
        <TransitionZone sectionId="about" zIndex={20} decor={false}>
          <About />
        </TransitionZone>

        <TransitionZone sectionId="projects" zIndex={30} overflowClip>
          <Projects />
        </TransitionZone>

        {/* Frame by Frame — fuera del card stack, en flujo normal sobre Projects. Escritorio con la escena «Señal»:
            hero-controller le pone data-see-through / data-gallery y es la sala de proyección (VideosStage);
            la escena se pausa cuando la tapa Stack. Sin escena: el layout de tarjetas. */}
        <div className="fbf-zone" data-section="videos" style={{ position: 'relative', zIndex: 40, overflow: 'visible' }}>
          <Videos />
        </div>

        {/* Stack — fuera del card stack, en flujo normal. Escritorio con la escena «Señal»: hero-controller le pone
            data-see-through / data-gallery y es la red por capas (StackStage); la escena se pausa cuando la tapa
            Experience (zIndex 50). Sin escena: la grilla de grupos. */}
        <div className="stack-zone" style={{ position: 'relative', zIndex: 40, overflow: 'visible' }}>
          <Skills />
        </div>

        {/* Experience «Señal»: con la escena viva entra transparente (hero-controller) y es el electrocardiograma vertical
            (ExperienceStage); overflow clip para que su escenario sticky funcione. Sin escena: el layout de columnas. */}
        <TransitionZone sectionId="experience" zIndex={50} overflowClip>
          <Experience />
        </TransitionZone>

        {/* Contact «Señal»: con la escena viva entra transparente (hero-controller) y es la convergencia (ContactStage):
            todas las líneas llegan al punto que late, que es el CTA. overflow clip para que su escenario sticky funcione.
            Sin escena: el layout anterior, opaco. */}
        <TransitionZone sectionId="contact" zIndex={60} overflowClip>
          <Contact />
        </TransitionZone>
      </main>
      <script dangerouslySetInnerHTML={{ __html: GALLERY_SCRIPT }} />
      {/* Sonido del sitio (apagado por defecto): un solo interruptor para todas las secciones */}
      <SoundToggle />
    </>
  );
}
