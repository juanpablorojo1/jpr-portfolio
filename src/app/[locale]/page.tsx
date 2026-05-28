'use client';

import dynamic from 'next/dynamic';
import { useLoadingScreen } from '../../hooks/useLoadingScreen';
import { useLenis } from '../../hooks/useLenis';
import Navbar from '../../components/layout/Navbar';
import Hero from '../../components/sections/Hero';
import About from '../../components/sections/About';
import Projects from '../../components/sections/Projects';
import Skills from '../../components/sections/Skills';
import Experience from '../../components/sections/Experience';
import Contact from '../../components/sections/Contact';

const LoadingScreen = dynamic(() => import('../../components/loading/LoadingScreen'), {
  ssr: false,
});
const CustomCursor = dynamic(() => import('../../components/ui/CustomCursor'), {
  ssr: false,
});

export default function HomePage() {
  const { isLoading, onLoadingComplete } = useLoadingScreen();

  // Initialize smooth scroll
  useLenis();

  return (
    <>
      {/* Custom cursor (desktop only) */}
      <CustomCursor />

      {/* Loading screen — rendered on top, slides away */}
      {isLoading && <LoadingScreen onComplete={onLoadingComplete} />}

      {/* Main content — always rendered, fades in when loading completes */}
      <main
        style={{
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.5s ease',
        }}
      >
        <Navbar />
        <Hero />
        <About />
        <Projects />
        <Skills />
        <Experience />
        <Contact />
      </main>
    </>
  );
}
