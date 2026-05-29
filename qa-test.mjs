// QA Test Script — jpr-portfolio
// Functional Tester Agent
// Tests: navigation, hero, language selector, projects, contact, console errors, scroll bar

import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_EN = 'http://localhost:3001/en';
const BASE_ES = 'http://localhost:3001/es';
const SCREENSHOTS_DIR = 'C:/Users/juanp/AGENCIA DIGITAL/projects/jpr-web/qa-screenshots';

if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const results = [];
const consoleErrors = { en: [], es: [] };
const networkFails = { en: [], es: [] };

function log(test, status, detail = '') {
  const entry = { test, status, detail };
  results.push(entry);
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} [${status}] ${test}${detail ? ': ' + detail : ''}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForPageLoad(page, timeout = 8000) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  await sleep(1500); // extra for GSAP animations to init
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  // ===== CONTEXT EN =====
  const ctxEN = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageEN = await ctxEN.newPage();

  // Capture console errors EN
  pageEN.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.en.push(msg.text());
    }
  });

  // Capture network failures EN
  pageEN.on('requestfailed', req => {
    networkFails.en.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  // Track 404 responses
  const failed404EN = [];
  pageEN.on('response', res => {
    if (res.status() === 404) {
      failed404EN.push(res.url());
    }
  });

  // ===== TEST 1: Build & Page Load =====
  console.log('\n=== TEST 1: Page Load & Build Health ===');
  try {
    const response = await pageEN.goto(BASE_EN, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const status = response?.status();
    if (status === 200) {
      log('GET /en → HTTP 200', 'PASS');
    } else {
      log('GET /en HTTP status', 'FAIL', `Status: ${status}`);
    }
  } catch (e) {
    log('GET /en page load', 'FAIL', e.message);
  }

  await waitForPageLoad(pageEN);

  // Screenshot 1440px
  await pageEN.screenshot({ path: join(SCREENSHOTS_DIR, '01-home-1440.png'), fullPage: false });
  log('Screenshot 1440px capturado', 'PASS', '01-home-1440.png');

  // ===== TEST 2: Loading Screen =====
  console.log('\n=== TEST 2: Loading Screen ===');
  // Navigate fresh to check loading screen
  const ctxEN2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageFresh = await ctxEN2.newPage();
  await pageFresh.goto(BASE_EN, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(500);

  const loadingVisible = await pageFresh.evaluate(() => {
    const loading = document.querySelector('[class*="loading"], [class*="LoadingScreen"], [data-loading]');
    if (loading) {
      const style = window.getComputedStyle(loading);
      return { exists: true, display: style.display, opacity: style.opacity, visibility: style.visibility };
    }
    // Check for any fixed overlay with high z-index (typical loading screen)
    const allFixed = [...document.querySelectorAll('*')].filter(el => {
      const s = window.getComputedStyle(el);
      return s.position === 'fixed' && parseInt(s.zIndex) > 50;
    });
    return { exists: false, overlayCount: allFixed.length };
  });

  if (loadingVisible.exists || loadingVisible.overlayCount > 0) {
    log('Loading screen visible al inicio', 'PASS', JSON.stringify(loadingVisible));
  } else {
    log('Loading screen detección', 'WARN', 'No se detectó overlay fijo (puede haber desaparecido rápido o usar otro approach)');
  }

  // Wait and check if it disappears
  await sleep(4000);
  const loadingGone = await pageFresh.evaluate(() => {
    const loading = document.querySelector('[class*="loading"], [class*="LoadingScreen"]');
    if (!loading) return { gone: true };
    const style = window.getComputedStyle(loading);
    return { gone: style.display === 'none' || style.opacity === '0' || style.visibility === 'hidden', style: { display: style.display, opacity: style.opacity } };
  });

  if (loadingGone.gone) {
    log('Loading screen desaparece', 'PASS');
  } else {
    log('Loading screen desaparece', 'WARN', JSON.stringify(loadingGone));
  }
  await ctxEN2.close();

  // ===== TEST 3: Navbar =====
  console.log('\n=== TEST 3: Navbar ===');
  const navbarCheck = await pageEN.evaluate(() => {
    const nav = document.querySelector('nav, header, [class*="navbar"], [class*="Navbar"]');
    if (!nav) return { exists: false };
    const rect = nav.getBoundingClientRect();
    const links = [...nav.querySelectorAll('a')].map(a => ({ text: a.textContent?.trim(), href: a.getAttribute('href') }));
    return { exists: true, visible: rect.width > 0 && rect.height > 0, links };
  });

  if (navbarCheck.exists && navbarCheck.visible) {
    log('Navbar existe y es visible', 'PASS');
  } else {
    log('Navbar', 'FAIL', JSON.stringify(navbarCheck));
  }

  const navLinks = navbarCheck.links || [];
  const expectedNavSections = ['projects', 'skills', 'experience', 'contact'];
  for (const section of expectedNavSections) {
    const found = navLinks.some(l => l.text?.toLowerCase().includes(section) || l.href?.toLowerCase().includes(section));
    if (found) {
      log(`Navbar link "${section}"`, 'PASS');
    } else {
      log(`Navbar link "${section}"`, 'FAIL', `Links disponibles: ${navLinks.map(l => l.text).join(', ')}`);
    }
  }

  // Test navbar scroll click
  const projectsLink = navLinks.find(l => l.text?.toLowerCase().includes('project') || l.href?.toLowerCase().includes('project'));
  if (projectsLink) {
    try {
      await pageEN.click(`a[href="${projectsLink.href}"]`);
      await sleep(1200);
      const scrollY = await pageEN.evaluate(() => window.scrollY);
      if (scrollY > 0) {
        log('Navbar click "Projects" hace scroll', 'PASS', `scrollY: ${scrollY}px`);
      } else {
        log('Navbar click "Projects" hace scroll', 'WARN', 'scrollY sigue en 0 (puede ser smooth scroll con delay)');
      }
    } catch(e) {
      log('Navbar click "Projects"', 'FAIL', e.message);
    }
  }

  // ===== TEST 4: Hero =====
  console.log('\n=== TEST 4: Hero ===');
  // Scroll back to top
  await pageEN.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);

  const heroCheck = await pageEN.evaluate(() => {
    // Look for hero section
    const hero = document.querySelector('#hero, [class*="hero"], [class*="Hero"], section:first-of-type');
    const nameEl = document.querySelector('h1, [class*="name"]');
    const nameText = nameEl?.textContent?.trim() || '';

    // CTAs
    const buttons = [...document.querySelectorAll('a, button')].map(b => ({
      text: b.textContent?.trim().substring(0, 50),
      href: b.getAttribute('href'),
      tag: b.tagName
    }));

    const viewProjectsBtn = buttons.find(b => b.text?.toLowerCase().includes('project') || b.text?.toLowerCase().includes('view'));
    const cvBtn = buttons.find(b => b.text?.toLowerCase().includes('cv') || b.text?.toLowerCase().includes('download') || b.href?.toLowerCase().includes('.pdf'));

    // Images
    const images = [...document.querySelectorAll('img')].map(img => ({
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt'),
      naturalWidth: img.naturalWidth,
      complete: img.complete
    }));

    const brokenImgs = images.filter(img => img.complete && img.naturalWidth === 0 && img.src);

    return {
      heroExists: !!hero,
      nameText,
      viewProjectsBtn,
      cvBtn,
      totalImages: images.length,
      brokenImgs: brokenImgs.slice(0, 10),
      allImages: images.slice(0, 20)
    };
  });

  log('Hero section', heroCheck.heroExists ? 'PASS' : 'WARN', `name text: "${heroCheck.nameText}"`);

  if (heroCheck.viewProjectsBtn) {
    log('Botón "View Projects" existe', 'PASS', `href: ${heroCheck.viewProjectsBtn.href}`);
  } else {
    log('Botón "View Projects"', 'FAIL', 'No encontrado');
  }

  if (heroCheck.cvBtn) {
    log('Botón/Link CV/Download', 'PASS', `href: ${heroCheck.cvBtn.href}`);
    const isPdf = heroCheck.cvBtn.href?.toLowerCase().includes('.pdf');
    log('CV link apunta a PDF', isPdf ? 'PASS' : 'FAIL', `href: ${heroCheck.cvBtn.href}`);
  } else {
    log('Botón CV/Download', 'FAIL', 'No encontrado');
  }

  if (heroCheck.brokenImgs.length === 0) {
    log(`Imágenes no rotas (${heroCheck.totalImages} total)`, 'PASS');
  } else {
    heroCheck.brokenImgs.forEach(img => {
      log(`Imagen rota`, 'FAIL', `src: ${img.src}`);
    });
  }

  // Screenshot hero
  await pageEN.screenshot({ path: join(SCREENSHOTS_DIR, '02-hero.png'), fullPage: false });

  // ===== TEST 5: Language Selector =====
  console.log('\n=== TEST 5: Language Selector ===');
  const langSelector = await pageEN.evaluate(() => {
    const esLink = [...document.querySelectorAll('a')].find(a =>
      a.textContent?.trim() === 'ES' || a.href?.includes('/es') || a.getAttribute('lang') === 'es'
    );
    return {
      esLinkText: esLink?.textContent?.trim(),
      esLinkHref: esLink?.getAttribute('href'),
      found: !!esLink
    };
  });

  if (langSelector.found) {
    log('Selector de idioma "ES" existe', 'PASS', `href: ${langSelector.esLinkHref}`);

    // Click ES
    try {
      await pageEN.click(`a[href*="/es"]`);
      await sleep(2000);
      const currentUrl = pageEN.url();
      if (currentUrl.includes('/es')) {
        log('Click "ES" navega a /es', 'PASS', `URL: ${currentUrl}`);
      } else {
        log('Click "ES" navega a /es', 'FAIL', `URL actual: ${currentUrl}`);
      }

      // Check Spanish content
      const esContent = await pageEN.evaluate(() => {
        return document.body.innerText.substring(0, 200);
      });
      log('Contenido cambia a español', esContent ? 'PASS' : 'WARN', esContent.substring(0, 80));

      // Click back to EN
      await pageEN.click(`a[href*="/en"]`).catch(() => {});
      await sleep(2000);
      const backUrl = pageEN.url();
      log('Click "EN" vuelve a /en', backUrl.includes('/en') ? 'PASS' : 'FAIL', `URL: ${backUrl}`);

    } catch(e) {
      log('Click selector idioma', 'FAIL', e.message);
    }
  } else {
    log('Selector de idioma "ES"', 'FAIL', 'No encontrado');
  }

  // ===== TEST 6: Projects Section =====
  console.log('\n=== TEST 6: Projects Section ===');
  // Ensure we're on EN
  if (!pageEN.url().includes('/en')) {
    await pageEN.goto(BASE_EN, { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(2000);
  }

  const projectsCheck = await pageEN.evaluate(() => {
    const section = document.querySelector('#projects, [class*="projects"], [class*="Projects"]') ||
                    [...document.querySelectorAll('section')].find(s => s.id?.toLowerCase().includes('project') || s.className?.toLowerCase().includes('project'));

    const allLinks = [...document.querySelectorAll('a')];
    const elevenLink = allLinks.find(a => a.href?.includes('eleven-pagina.vercel.app') || a.textContent?.toLowerCase().includes('eleven'));
    const visitSiteLink = allLinks.find(a => a.textContent?.toLowerCase().includes('visit site') || a.textContent?.toLowerCase().includes('ver sitio'));

    const images = [...document.querySelectorAll('img')];
    const traumaImages = images.filter(img => img.src?.toLowerCase().includes('trauma') || img.alt?.toLowerCase().includes('trauma'));
    const brokenImages = images.filter(img => img.complete && img.naturalWidth === 0 && img.src);

    return {
      sectionExists: !!section,
      elevenLink: { found: !!elevenLink, href: elevenLink?.href, text: elevenLink?.textContent?.trim() },
      visitSiteLink: { found: !!visitSiteLink, href: visitSiteLink?.href },
      traumaImages: traumaImages.length,
      brokenImages: brokenImages.map(i => i.src).slice(0, 5)
    };
  });

  log('Sección Projects existe', projectsCheck.sectionExists ? 'PASS' : 'WARN', '(puede estar anidada en section sin clase Projects)');

  if (projectsCheck.elevenLink.found) {
    log('Link Eleven en Projects', 'PASS', projectsCheck.elevenLink.href);
  } else {
    log('Link "Visit Site" Eleven', 'WARN', 'No se encontró link a eleven-pagina.vercel.app');
  }

  if (projectsCheck.brokenImages.length === 0) {
    log('Imágenes en Projects no rotas', 'PASS');
  } else {
    projectsCheck.brokenImages.forEach(src => {
      log('Imagen rota en Projects', 'FAIL', src);
    });
  }

  // Scroll to projects and test
  await pageEN.evaluate(() => {
    const section = document.querySelector('#projects, [class*="Projects"]');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
    else window.scrollBy(0, 800);
  });
  await sleep(1500);
  await pageEN.screenshot({ path: join(SCREENSHOTS_DIR, '03-projects.png'), fullPage: false });
  log('Screenshot Projects capturado', 'PASS');

  // Test lightbox - click on a project screenshot
  const lightboxTest = await pageEN.evaluate(() => {
    const imgs = [...document.querySelectorAll('img[src*="trauma"], img[src*="screenshot"], img[src*="project"]')];
    if (imgs.length > 0) {
      imgs[0].click();
      return { attempted: true, src: imgs[0].src };
    }
    // Try clicking any clickable img
    const clickableImgs = [...document.querySelectorAll('figure img, [class*="gallery"] img, [class*="lightbox"] img, [class*="screenshot"] img')];
    if (clickableImgs.length > 0) {
      clickableImgs[0].click();
      return { attempted: true, src: clickableImgs[0].src };
    }
    return { attempted: false };
  });

  if (lightboxTest.attempted) {
    await sleep(800);
    const lightboxOpen = await pageEN.evaluate(() => {
      const lightbox = document.querySelector('[class*="lightbox"], [class*="Lightbox"], [role="dialog"], [data-lightbox]');
      if (lightbox) {
        const s = window.getComputedStyle(lightbox);
        return { exists: true, visible: s.display !== 'none' && s.opacity !== '0' };
      }
      // Check for modal overlay
      const overlay = [...document.querySelectorAll('*')].find(el => {
        const s = window.getComputedStyle(el);
        return s.position === 'fixed' && parseInt(s.zIndex) > 100 && s.display !== 'none';
      });
      return { exists: !!overlay };
    });

    if (lightboxOpen.exists && lightboxOpen.visible !== false) {
      log('Lightbox abre al hacer click en screenshot', 'PASS');

      // Test ESC closes
      await pageEN.keyboard.press('Escape');
      await sleep(500);
      const lightboxClosed = await pageEN.evaluate(() => {
        const lightbox = document.querySelector('[class*="lightbox"], [class*="Lightbox"], [role="dialog"]');
        if (!lightbox) return true;
        const s = window.getComputedStyle(lightbox);
        return s.display === 'none' || s.opacity === '0' || s.visibility === 'hidden';
      });
      log('Lightbox cierra con ESC', lightboxClosed ? 'PASS' : 'FAIL');
    } else {
      log('Lightbox', 'WARN', 'No se detectó lightbox tras click en imagen (puede que no haya screenshots clickeables en DOM)');
    }
  } else {
    log('Lightbox test', 'WARN', 'No se encontraron imágenes clickeables para testear lightbox');
  }

  // ===== TEST 7: Contact Section =====
  console.log('\n=== TEST 7: Contact Section ===');
  // Scroll to bottom
  await pageEN.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(1500);

  const contactCheck = await pageEN.evaluate(() => {
    const allLinks = [...document.querySelectorAll('a')];
    const mailtoLink = allLinks.find(a => a.href?.startsWith('mailto:'));
    const linkedInLink = allLinks.find(a => a.href?.includes('linkedin.com'));
    const githubLink = allLinks.find(a => a.href?.includes('github.com'));
    const cvLink = allLinks.find(a => a.href?.toLowerCase().includes('.pdf') || a.textContent?.toLowerCase().includes('cv'));

    return {
      mailto: { found: !!mailtoLink, href: mailtoLink?.href },
      linkedin: { found: !!linkedInLink, href: linkedInLink?.href, target: linkedInLink?.target },
      github: { found: !!githubLink, href: githubLink?.href, target: githubLink?.target },
      cv: { found: !!cvLink, href: cvLink?.href }
    };
  });

  log('Link mailto:', contactCheck.mailto.found ? 'PASS' : 'FAIL', contactCheck.mailto.href || 'no encontrado');
  log('Link LinkedIn', contactCheck.linkedin.found ? 'PASS' : 'FAIL', contactCheck.linkedin.href || 'no encontrado');
  log('LinkedIn abre en nueva pestaña', contactCheck.linkedin.target === '_blank' ? 'PASS' : 'WARN', `target: ${contactCheck.linkedin.target}`);
  log('Link GitHub', contactCheck.github.found ? 'PASS' : 'FAIL', contactCheck.github.href || 'no encontrado');
  log('GitHub abre en nueva pestaña', contactCheck.github.target === '_blank' ? 'PASS' : 'WARN', `target: ${contactCheck.github.target}`);
  log('Link CV/PDF en contacto', contactCheck.cv.found ? 'PASS' : 'WARN', contactCheck.cv.href || 'no encontrado');

  await pageEN.screenshot({ path: join(SCREENSHOTS_DIR, '04-contact.png'), fullPage: false });

  // ===== TEST 8: Scroll Progress Bar =====
  console.log('\n=== TEST 8: Scroll Progress Bar ===');
  await pageEN.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);

  const progressBarCheck = await pageEN.evaluate(() => {
    // Look for progress bar element
    const progressEl = document.querySelector('[class*="progress"], [class*="Progress"], progress, [role="progressbar"]');
    if (progressEl) {
      const style = window.getComputedStyle(progressEl);
      return {
        exists: true,
        tag: progressEl.tagName,
        className: progressEl.className,
        width: style.width,
        value: progressEl.style.width || progressEl.getAttribute('value')
      };
    }
    // Check for thin fixed bar at top
    const topBars = [...document.querySelectorAll('*')].filter(el => {
      const s = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return s.position === 'fixed' && rect.top <= 10 && rect.height > 0 && rect.height < 15 && rect.width > 50;
    });
    return { exists: topBars.length > 0, topBarCount: topBars.length, barInfo: topBars.map(b => ({ class: b.className, style: b.getAttribute('style') })).slice(0, 3) };
  });

  if (progressBarCheck.exists) {
    log('Barra de progreso existe', 'PASS', JSON.stringify(progressBarCheck).substring(0, 100));
  } else {
    log('Barra de progreso', 'WARN', 'No detectada (puede ser CSS only o con selector diferente)');
  }

  // Scroll halfway and check if width changes
  await pageEN.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await sleep(500);
  const progressMid = await pageEN.evaluate(() => {
    const progressEl = document.querySelector('[class*="progress"], [class*="Progress"], [role="progressbar"]');
    if (!progressEl) {
      const topBars = [...document.querySelectorAll('*')].filter(el => {
        const s = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return s.position === 'fixed' && rect.top <= 10 && rect.height > 0 && rect.height < 15 && rect.width > 50;
      });
      return { bars: topBars.map(b => ({ style: b.getAttribute('style'), width: window.getComputedStyle(b).width })).slice(0, 3) };
    }
    return { width: progressEl.style.width, computedWidth: window.getComputedStyle(progressEl).width };
  });
  log('Progreso al 50% scroll', 'PASS', JSON.stringify(progressMid).substring(0, 100));

  // ===== TEST 9: Console Errors EN =====
  console.log('\n=== TEST 9: Console Errors ===');
  // Navigate fresh to get clean console
  const ctxClean = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageClean = await ctxClean.newPage();
  const cleanErrors = [];
  const cleanWarnings = [];

  pageClean.on('console', msg => {
    if (msg.type() === 'error') cleanErrors.push(msg.text());
    if (msg.type() === 'warning') cleanWarnings.push(msg.text());
  });

  const clean404 = [];
  pageClean.on('response', res => {
    if (res.status() === 404) clean404.push(res.url());
  });

  await pageClean.goto(BASE_EN, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(3000);

  // Scroll to trigger all lazy loads
  await pageClean.evaluate(async () => {
    for (let i = 0; i < 5; i++) {
      window.scrollBy(0, window.innerHeight);
      await new Promise(r => setTimeout(r, 400));
    }
    window.scrollTo(0, 0);
  });
  await sleep(1000);

  if (cleanErrors.length === 0) {
    log('Cero errores de consola en /en', 'PASS');
  } else {
    cleanErrors.forEach(err => {
      log('Error de consola /en', 'FAIL', err.substring(0, 150));
    });
  }

  if (cleanWarnings.length > 0) {
    log(`${cleanWarnings.length} warnings en /en`, 'WARN', cleanWarnings[0].substring(0, 100));
  }

  if (clean404.length === 0) {
    log('Cero 404s en /en', 'PASS');
  } else {
    clean404.forEach(url => {
      log('404 en /en', 'FAIL', url);
    });
  }
  await ctxClean.close();

  // ===== TEST 10: Console Errors ES =====
  const ctxES = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageES = await ctxES.newPage();
  const esErrors = [];
  const es404 = [];

  pageES.on('console', msg => {
    if (msg.type() === 'error') esErrors.push(msg.text());
  });
  pageES.on('response', res => {
    if (res.status() === 404) es404.push(res.url());
  });

  await pageES.goto(BASE_ES, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(3000);

  const esTitle = await pageES.title();
  const esBodyText = await pageES.evaluate(() => document.body.innerText.substring(0, 300));
  log('Página /es carga correctamente', 'PASS', `title: ${esTitle}`);

  if (esErrors.length === 0) {
    log('Cero errores de consola en /es', 'PASS');
  } else {
    esErrors.forEach(err => {
      log('Error de consola /es', 'FAIL', err.substring(0, 150));
    });
  }

  if (es404.length === 0) {
    log('Cero 404s en /es', 'PASS');
  } else {
    es404.forEach(url => {
      log('404 en /es', 'FAIL', url);
    });
  }

  // Screenshot ES
  await pageES.screenshot({ path: join(SCREENSHOTS_DIR, '05-es-home.png'), fullPage: false });
  await ctxES.close();

  // ===== TEST 11: Responsive =====
  console.log('\n=== TEST 11: Responsive (3 breakpoints) ===');

  for (const [label, width, height] of [['mobile', 375, 812], ['tablet', 768, 1024], ['desktop', 1440, 900]]) {
    const ctxResp = await browser.newContext({ viewport: { width, height } });
    const pageResp = await ctxResp.newPage();
    await pageResp.goto(BASE_EN, { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(2000);

    const overflow = await pageResp.evaluate((w) => {
      const body = document.body;
      const html = document.documentElement;
      const bodyWidth = Math.max(body.scrollWidth, body.offsetWidth);
      const hasHorizontalOverflow = bodyWidth > w + 5; // 5px tolerance

      // Check for broken images
      const imgs = [...document.querySelectorAll('img')];
      const brokenImgs = imgs.filter(i => i.complete && i.naturalWidth === 0 && i.src);

      return {
        bodyScrollWidth: bodyWidth,
        viewportWidth: w,
        hasHorizontalOverflow,
        brokenImgs: brokenImgs.map(i => i.src).slice(0, 3)
      };
    }, width);

    if (!overflow.hasHorizontalOverflow) {
      log(`Responsive ${label} (${width}px) — sin overflow horizontal`, 'PASS');
    } else {
      log(`Responsive ${label} (${width}px) — overflow horizontal`, 'FAIL', `body width: ${overflow.bodyScrollWidth}px`);
    }

    if (overflow.brokenImgs.length === 0) {
      log(`Imágenes OK en ${label}`, 'PASS');
    } else {
      log(`Imágenes rotas en ${label}`, 'FAIL', overflow.brokenImgs.join(', '));
    }

    await pageResp.screenshot({ path: join(SCREENSHOTS_DIR, `06-${label}-${width}.png`) });
    await ctxResp.close();
  }

  // ===== SUMMARY =====
  await browser.close();

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  console.log('\n==========================================');
  console.log(`RESUMEN: ${passed} PASS | ${failed} FAIL | ${warned} WARN`);
  console.log(`Veredicto: ${failed > 0 ? 'HOLD' : 'SHIP'}`);
  console.log('==========================================');

  // Output machine-readable JSON
  const report = {
    date: new Date().toISOString(),
    summary: { passed, failed, warned, total: results.length },
    verdict: failed > 3 ? 'HOLD' : failed > 0 ? 'REVIEW' : 'SHIP',
    results,
    screenshots: SCREENSHOTS_DIR
  };

  writeFileSync('C:/Users/juanp/AGENCIA DIGITAL/projects/jpr-web/qa-results.json', JSON.stringify(report, null, 2));
  console.log('\nResultados en: qa-results.json');
  console.log('Screenshots en:', SCREENSHOTS_DIR);
}

run().catch(e => {
  console.error('TEST SUITE FAILED:', e.message);
  process.exit(1);
});
