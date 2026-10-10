'use client';

import dynamic from 'next/dynamic';
import Navbar from '../../components/layout/Navbar';
import Hero from '../../components/sections/Hero';
import About from '../../components/sections/About';
import Projects from '../../components/sections/Projects';
import Videos from '../../components/sections/Videos';
import Skills from '../../components/sections/Skills';
import Experience from '../../components/sections/Experience';
import Contact from '../../components/sections/Contact';
import TransitionZone from '../../components/motion/TransitionZone';

const CustomCursor = dynamic(() => import('../../components/ui/CustomCursor'), {
  ssr: false,
});
const ScrollProgressBar = dynamic(() => import('../../components/ui/ScrollProgressBar'), {
  ssr: false,
});
const SectionLabel = dynamic(() => import('../../components/ui/SectionLabel'), {
  ssr: false,
});

export default function HomePage() {
  return (
    <>
      <CustomCursor />
      <ScrollProgressBar />
      <SectionLabel />

      {/* Sin loading screen: el hero «Señal» es el intro (un latido en la oscuridad) y se ve desde el primer frame. */}
      <main>
        <Navbar />

        {/* Card stack with cinematic transitions —
            each section sticks, gets a watermark anchor word + connecting line,
            covered by the next as the user scrolls. */}
        <TransitionZone sectionId="hero" zIndex={10}>
          <Hero />
        </TransitionZone>

        <TransitionZone sectionId="about" zIndex={20}>
          <About />
        </TransitionZone>

        <TransitionZone sectionId="projects" zIndex={30} overflowClip>
          <Projects />
        </TransitionZone>

        {/* Videos — outside the card stack, same pattern as Skills: normal flow over the
            sticky Projects card, so the horizontal rail and the stack stay untouched. */}
        <div style={{ position: 'relative', zIndex: 40, overflow: 'visible' }}>
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
    </>
  );
}
