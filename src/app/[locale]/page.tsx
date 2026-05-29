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
      {/* Custom cursor (desktop only) */}
      <CustomCursor />

      {/* Scroll progress bar — fixed top */}
      <ScrollProgressBar />

      {/* Active section label — fixed left side */}
      <SectionLabel />

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

        {/* Card stack — each section sticks at top and gets covered by the next */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          <Hero />
        </div>

        <div style={{ position: 'sticky', top: 0, zIndex: 20, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          <About />
        </div>

        {/* Projects: overflow:clip preserves inner sticky top-0 for horizontal scroll */}
        <div style={{ position: 'sticky', top: 0, zIndex: 30, overflow: 'clip', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          <Projects />
        </div>

        <div style={{ position: 'sticky', top: 0, zIndex: 40, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          <Skills />
        </div>

        <div style={{ position: 'sticky', top: 0, zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          <Experience />
        </div>

        <div style={{ position: 'sticky', top: 0, zIndex: 60, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          <Contact />
        </div>
      </main>
    </>
  );
}
