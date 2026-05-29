'use client';

import dynamic from 'next/dynamic';
import { useLoadingScreen } from '../../hooks/useLoadingScreen';
import Navbar from '../../components/layout/Navbar';
import Hero from '../../components/sections/Hero';
import About from '../../components/sections/About';
import Projects from '../../components/sections/Projects';
import Skills from '../../components/sections/Skills';
import Experience from '../../components/sections/Experience';
import Contact from '../../components/sections/Contact';
import TransitionZone from '../../components/motion/TransitionZone';

const LoadingScreen = dynamic(() => import('../../components/loading/LoadingScreen'), {
  ssr: false,
});
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
  const { isLoading, onLoadingComplete } = useLoadingScreen();

  return (
    <>
      <CustomCursor />
      <ScrollProgressBar />
      <SectionLabel />

      {isLoading && <LoadingScreen onComplete={onLoadingComplete} />}

      <main
        style={{
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.5s ease',
        }}
      >
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

        <TransitionZone sectionId="skills" zIndex={40}>
          <Skills />
        </TransitionZone>

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
