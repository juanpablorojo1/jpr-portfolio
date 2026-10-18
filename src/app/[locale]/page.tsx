'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import Navbar from '../../components/layout/Navbar';
import Hero from '../../components/sections/Hero';
import TransitionZone from '../../components/motion/TransitionZone';
// El CSS de las secciones diferidas va estático, en el orden de siempre: queda en las hojas de la página (como antes) y
// no en una hoja por chunk dinámico (cada una era un pedido más que bloqueaba el primer pintado).
import '../../components/sections/about-senal.css';
import '../../components/sections/projects-senal.css';
import '../../components/ui/project-demo.css';
import '../../components/sections/videos-senal.css';
import '../../components/sections/videos-phone.css';
import '../../components/sections/stack-senal.css';
import '../../components/sections/stack-phone.css';
import '../../components/sections/experience-senal.css';
import '../../components/sections/experience-phone.css';
import '../../components/sections/contact-senal.css';
import '../../components/sections/contact-phone.css';
import SoundToggle from '../../components/ui/SoundToggle';
import { phoneLoad } from '../../lib/phoneGate';

// Bajo el pliegue: HTML del servidor siempre; el JS de cada sección en su chunk, que en el teléfono se pide recién con la
// página cargada y de a una (phoneLoad, U6b: el LCP del hero ya no espera la evaluación de todo el sitio). En escritorio, en el acto.
const About = dynamic(() => phoneLoad(() => import('../../components/sections/About')));
const Projects = dynamic(() => phoneLoad(() => import('../../components/sections/Projects')));
const Videos = dynamic(() => phoneLoad(() => import('../../components/sections/Videos')));
const Skills = dynamic(() => phoneLoad(() => import('../../components/sections/Skills')));
const Experience = dynamic(() => phoneLoad(() => import('../../components/sections/Experience')));
const Contact = dynamic(() => phoneLoad(() => import('../../components/sections/Contact')));

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
      <main id="content">

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
        <div className="fbf-zone" data-section="videos" suppressHydrationWarning style={{ position: 'relative', zIndex: 40, overflow: 'visible' }}>
          <Videos />
        </div>

        {/* Stack — fuera del card stack, en flujo normal. Escritorio con la escena «Señal»: hero-controller le pone
            data-see-through / data-gallery y es la red por capas (StackStage); la escena se pausa cuando la tapa
            Experience (zIndex 50). Sin escena: la grilla de grupos. */}
        <div className="stack-zone" suppressHydrationWarning style={{ position: 'relative', zIndex: 40, overflow: 'visible' }}>
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
