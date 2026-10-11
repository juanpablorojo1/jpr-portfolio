'use client';

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

export default function HomePage() {
  return (
    <>
      {/* Sin loading screen: el hero «Señal» es el intro (un latido en la oscuridad) y se ve desde el primer frame. */}
      <Navbar />
      <main>

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

        {/* Skills — outside card stack so all content is reachable via normal scroll.
            Experience (zIndex 50) still slides over it naturally as the user scrolls. */}
        <div style={{ position: 'relative', zIndex: 40, overflow: 'visible' }}>
          <Skills />
        </div>

        <TransitionZone sectionId="experience" zIndex={50}>
          <Experience />
        </TransitionZone>

        <TransitionZone sectionId="contact" zIndex={60}>
          <Contact />
        </TransitionZone>
      </main>
      {/* Sonido del sitio (apagado por defecto): un solo interruptor para todas las secciones */}
      <SoundToggle />
    </>
  );
}
