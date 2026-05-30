'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const HeroCanvas = dynamic(() => import('../canvas/HeroCanvas'), { ssr: false });

const PHOTOS = [
  '/hackathon-stage-1.jpg',
  '/hackathon-stage-2.jpg',
] as const;

export default function Hero() {
  const t = useTranslations('hero');
  const titleRef = useRef<HTMLDivElement>(null);
  const surnameRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const ctasRef = useRef<HTMLDivElement>(null);
  const photoContainerRef = useRef<HTMLDivElement>(null);

  // Two photo layer refs — hardcoded (no conditional hooks)
  const photoRef0 = useRef<HTMLDivElement>(null);
  const photoRef1 = useRef<HTMLDivElement>(null);


  // Geometric float refs
  const floatRef1 = useRef<HTMLDivElement>(null);
  const floatRef2 = useRef<HTMLDivElement>(null);
  const floatRef3 = useRef<HTMLDivElement>(null);

  // GSAP — nombre reveal + texto fade-up (preservado intacto)
  useEffect(() => {
    let cleanup = false;

    const animate = async () => {
      const { default: gsap } = await import('gsap');
      if (cleanup) return;

      const tl = gsap.timeline({ delay: 0.1 });

      tl.fromTo(
        titleRef.current,
        { clipPath: 'inset(100% 0 0 0)', opacity: 1 },
        { clipPath: 'inset(0% 0 0 0)', duration: 0.8, ease: 'expo.out' }
      );
      tl.fromTo(
        surnameRef.current,
        { clipPath: 'inset(100% 0 0 0)', opacity: 1 },
        { clipPath: 'inset(0% 0 0 0)', duration: 0.8, ease: 'expo.out' },
        '-=0.6'
      );
      tl.fromTo(
        roleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
        '-=0.3'
      );
      tl.fromTo(
        taglineRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
        '-=0.4'
      );
      tl.fromTo(
        ctasRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },
        '-=0.3'
      );
    };

    animate();
    return () => { cleanup = true; };
  }, []);


  // GSAP — geometric float parallax with ScrollTrigger
  useEffect(() => {
    let cleanup = false;

    const initFloats = async () => {
      if (typeof window === 'undefined' || window.innerWidth <= 1024) return;

      const { default: gsap } = await import('gsap');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { ScrollTrigger } = await import('gsap/ScrollTrigger') as any;
      if (cleanup) return;

      gsap.registerPlugin(ScrollTrigger);

      const trigger = {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5,
      };

      if (floatRef1.current) {
        gsap.to(floatRef1.current, { y: 40, ease: 'none', scrollTrigger: trigger });
      }
      if (floatRef2.current) {
        gsap.to(floatRef2.current, { y: -60, ease: 'none', scrollTrigger: trigger });
      }
      if (floatRef3.current) {
        gsap.to(floatRef3.current, { y: 80, x: 20, ease: 'none', scrollTrigger: trigger });
      }
    };

    initFloats();
    return () => { cleanup = true; };
  }, []);

  // GSAP — parallax foto derecha con ScrollTrigger
  useEffect(() => {
    let cleanup = false;

    const initParallax = async () => {
      const { default: gsap } = await import('gsap');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { ScrollTrigger } = await import('gsap/ScrollTrigger') as any;
      if (cleanup) return;

      gsap.registerPlugin(ScrollTrigger);

      if (photoContainerRef.current) {
        gsap.to(photoContainerRef.current, {
          y: '15%',
          ease: 'none',
          scrollTrigger: {
            trigger: '#hero',
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      }
    };

    initParallax();
    return () => {
      cleanup = true;
    };
  }, []);

  // GSAP — crossfade entre foto 0 y foto 1 cada 5 segundos
  useEffect(() => {
    let cleanup = false;
    let intervalId: ReturnType<typeof setInterval>;

    const initCrossfade = async () => {
      const { default: gsap } = await import('gsap');
      if (cleanup) return;

      // Estado inicial: foto 0 visible, foto 1 invisible
      gsap.set(photoRef0.current, { opacity: 1 });
      gsap.set(photoRef1.current, { opacity: 0 });

      let current = 0;

      intervalId = setInterval(() => {
        if (cleanup) return;

        const next = current === 0 ? 1 : 0;
        const currentRef = current === 0 ? photoRef0.current : photoRef1.current;
        const nextRef = next === 0 ? photoRef0.current : photoRef1.current;

        gsap.to(nextRef, { opacity: 1, duration: 1, ease: 'power2.inOut' });
        gsap.to(currentRef, { opacity: 0, duration: 1, ease: 'power2.inOut' });

        current = next;
      }, 5000);
    };

    initCrossfade();
    return () => {
      cleanup = true;
      clearInterval(intervalId);
    };
  }, []);

  const handleViewWork = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      id="hero"
      className="relative flex flex-col justify-center overflow-hidden bg-bg min-h-screen lg:min-h-screen"
    >
      {/* Particle canvas */}
      <HeroCanvas />

      {/* Foto de fondo — mitad derecha, solo desktop */}
      <div
        ref={photoContainerRef}
        className="absolute inset-y-0 right-0 hidden lg:block pointer-events-none"
        style={{ width: '52%' }}
        aria-hidden="true"
      >
        {/* Foto 1 */}
        <div ref={photoRef0} className="absolute inset-0">
          <Image
            src={PHOTOS[0]}
            alt=""
            fill
            priority
            className="object-cover object-top"
            style={{ filter: 'grayscale(80%) contrast(0.95)', opacity: 0.55 }}
            sizes="52vw"
          />
        </div>

        {/* Foto 2 — crossfade */}
        <div ref={photoRef1} className="absolute inset-0" style={{ opacity: 0 }}>
          <Image
            src={PHOTOS[1]}
            alt=""
            fill
            priority
            className="object-cover object-center"
            style={{ filter: 'grayscale(80%) contrast(0.95)', opacity: 0.55 }}
            sizes="52vw"
          />
        </div>

        {/* Gradiente izquierda — funde la foto con el fondo oscuro */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, #080808 0%, rgba(8,8,8,0.7) 25%, rgba(8,8,8,0.2) 55%, transparent 100%)',
          }}
        />
        {/* Gradiente top/bottom — suaviza bordes */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, #080808 0%, transparent 12%, transparent 88%, #080808 100%)',
          }}
        />
        {/* Tinte rojo duotono */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(232,39,42,0.08)', mixBlendMode: 'screen' }}
        />
      </div>

      {/* Grid layout: 60/40 desktop, columna unica mobile */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-24 pb-8 lg:pb-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[60%_40%] gap-0 items-center lg:min-h-[calc(100vh-10rem)]">

          {/* LEFT — contenido de texto */}
          <div className="flex flex-col justify-center pr-0 lg:pr-8">
            {/* Name */}
            <div className="overflow-hidden mb-0">
              <div
                ref={titleRef}
                className="font-display text-white leading-none tracking-widest uppercase"
                style={{
                  fontSize: 'clamp(4rem, 10vw, 8rem)',
                  clipPath: 'inset(100% 0 0 0)',
                }}
              >
                {t('title')}
              </div>
            </div>
            <div className="overflow-hidden mb-4">
              <div
                ref={surnameRef}
                className="font-display leading-none tracking-widest uppercase"
                style={{
                  fontSize: 'clamp(4rem, 10vw, 8rem)',
                  color: '#E8272A',
                  clipPath: 'inset(100% 0 0 0)',
                }}
              >
                {t('surname')}
              </div>
            </div>

            {/* Role */}
            <div
              ref={roleRef}
              className="font-ui text-off-white text-base mb-4 opacity-0"
            >
              {t('role')}
            </div>

            {/* Tagline */}
            <div
              ref={taglineRef}
              className="font-ui text-off-white text-xl md:text-3xl font-light leading-snug mb-10 max-w-2xl opacity-0"
            >
              {t('tagline')}
            </div>

            {/* CTAs */}
            <div ref={ctasRef} className="flex flex-wrap gap-4 opacity-0">
              <a
                href="#projects"
                onClick={handleViewWork}
                className="
                  inline-block font-ui font-bold text-sm text-white
                  border border-accent px-8 py-3
                  tracking-widest uppercase
                  transition-all duration-200
                  hover:bg-accent
                  hover:shadow-btn-hover
                "
              >
                {t('cta1')}
              </a>
              <a
                href="/CV_Juan_Pablo_Rojo_EN.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="
                  inline-block font-ui font-bold text-sm text-accent
                  border border-border px-8 py-3
                  tracking-widest uppercase
                  transition-all duration-200
                  hover:border-accent hover:text-white hover:bg-accent/10
                "
              >
                {t('cta2')}
              </a>
            </div>
          </div>

          {/* RIGHT — espacio reservado para foto absoluta (solo desktop) */}
          <div className="hidden lg:block" aria-hidden="true" />

        </div>
      </div>

      {/* Mobile hero photo — below text, portrait */}
      <div className="block lg:hidden w-full px-6 pb-12 mt-4" aria-hidden="true">
        <div className="relative w-full aspect-[3/4] max-h-[50vh] overflow-hidden">
          <Image
            src={PHOTOS[0]}
            alt=""
            fill
            priority
            className="object-cover object-top"
            style={{ filter: 'grayscale(70%) contrast(0.9)', opacity: 0.75 }}
            sizes="100vw"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 60%, #080808 100%)' }} />
          <div className="absolute inset-0" style={{ background: 'rgba(232,39,42,0.06)', mixBlendMode: 'screen' }} />
        </div>
      </div>

      {/* Scroll indicator — lateral editorial */}
      <div
        className="absolute bottom-8 left-6 hidden lg:flex flex-col items-center gap-3 opacity-35"
        aria-hidden="true"
      >
        <div className="w-px h-16 bg-gradient-to-b from-accent to-transparent" />
        <span
          className="font-mono text-[10px] text-muted tracking-widest uppercase"
          style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
        >
          scroll
        </span>
      </div>


      {/* Geometric float elements — parallax decorative, desktop only */}
      <div
        ref={floatRef1}
        aria-hidden="true"
        className="hidden lg:block absolute pointer-events-none"
        style={{
          top: '40%',
          left: '60%',
          width: '80px',
          height: '1px',
          background: '#2A2A2A',
          opacity: 0.6,
          zIndex: 1,
        }}
      />
      <div
        ref={floatRef2}
        aria-hidden="true"
        className="hidden lg:block absolute pointer-events-none"
        style={{
          top: '60%',
          right: '55%',
          width: '1px',
          height: '60px',
          background: '#E8272A',
          opacity: 0.3,
          zIndex: 1,
        }}
      />
      <div
        ref={floatRef3}
        aria-hidden="true"
        className="hidden lg:block absolute pointer-events-none"
        style={{
          top: '25%',
          right: '40%',
          width: '4px',
          height: '4px',
          background: '#E8272A',
          opacity: 0.4,
          zIndex: 1,
        }}
      />

    </section>
  );
}
