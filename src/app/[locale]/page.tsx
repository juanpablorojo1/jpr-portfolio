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

        <TransitionZone sectionId="contact" zIndex={60}>
          <Contact />
        </TransitionZone>
      </main>
      {/* Sonido del sitio (apagado por defecto): un solo interruptor para todas las secciones */}
      <SoundToggle />
    </>
  );
}
