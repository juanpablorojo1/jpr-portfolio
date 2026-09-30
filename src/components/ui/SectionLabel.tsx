'use client';

import { useEffect, useRef, useState } from 'react';

type SectionId = 'hero' | 'about' | 'projects' | 'videos' | 'skills' | 'experience' | 'contact';

const SECTION_LABELS: Record<SectionId, string> = {
  hero: '// HERO',
  about: '// ABOUT',
  projects: '// PROJECTS',
  videos: '// VIDEO',
  skills: '// SKILLS',
  experience: '// EXPERIENCE',
  contact: '// CONTACT',
};

const SECTION_IDS: SectionId[] = [
  'hero',
  'about',
  'projects',
  'videos',
  'skills',
  'experience',
  'contact',
];

export default function SectionLabel() {
  const [activeSection, setActiveSection] = useState<SectionId>('hero');
  const [visible, setVisible] = useState(false);
  const prevSection = useRef<SectionId>('hero');

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const incoming = id as SectionId;
              if (incoming !== prevSection.current) {
                setVisible(false);
                setTimeout(() => {
                  setActiveSection(incoming);
                  prevSection.current = incoming;
                  setVisible(true);
                }, 200);
              } else {
                setVisible(true);
              }
            }
          });
        },
        { threshold: 0.3 }
      );

      observer.observe(el);
      observers.push(observer);
    });

    // Show after mount once initial section is detected
    setVisible(true);

    return () => {
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  const label = SECTION_LABELS[activeSection];

  return (
    <div
      className="hidden lg:block"
      style={{
        position: 'fixed',
        left: '1.5rem',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 30,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '10px',
          letterSpacing: '0.08em',
          color: '#666666',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          display: 'block',
          userSelect: 'none',
        }}
      >
        {label}
      </span>
    </div>
  );
}
