# Animation Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 premium animation and micro-interaction improvements in the JPR portfolio.

**Architecture:** Each task is a self-contained edit to one or two files (a section component + globals.css). GSAP is already set up with the async import pattern. All scrub animations skip on mobile (window.innerWidth < 1024). No pin, no Lenis.

**Tech Stack:** Next.js 14.2.35, TypeScript, Tailwind v3.4.1, GSAP 3 + ScrollTrigger, native scroll.

---

## File Map

| File | Task(s) | Change |
|---|---|---|
| `src/components/sections/Experience.tsx` | 1 | Per-item scaleY line + clip-path role reveal + dot ping |
| `src/components/sections/Hero.tsx` | 2 | Add reverse marquee strip |
| `src/app/globals.css` | 2, 5 | Add `@keyframes marquee-reverse` + `.marquee-container` hover rule |
| `src/components/sections/About.tsx` | 3 | Add Age counter with inline GSAP fadeUp |
| `src/components/sections/Contact.tsx` | 4 | Color shift scrub on "SOMETHING." / headline_2 |
| `src/components/sections/Skills.tsx` | 5 | Add `marquee-container` / `marquee-content` class names |

---

## Task 1: Experience — per-item scaleY line + clip-path role reveal + dot ping

**Files:**
- Modify: `src/components/sections/Experience.tsx`

### Context

Current state:
- One `lineRef` animates `scaleY 0→1` for the whole column (already done).
- Items fade-left with a stagger scrub.
- Dots scale 0→1 with scrub.

Required improvements:
- Each timeline item gets its own vertical connector line (small `div`) that grows `scaleY: 0→1` as the item enters view via scrub.
- The role `<p>` (`.timeline-role`) gets a `clip-path: inset(0 100% 0 0) → inset(0 0% 0 0)` reveal with scrub.
- After the dot appears (scale 1), a CSS `ping` animation fires — implemented as a second absolutely-positioned ring element that uses Tailwind's `animate-ping` class, revealed once the dot is in view. Since the dot uses `back.out` scrub (not a true event), we'll trigger ping via an `IntersectionObserver` on each dot.

### Steps

- [ ] **Step 1: Add per-item line divs and role class in JSX**

In `Experience.tsx`, inside the `experienceItems.map`, replace the current block:

```tsx
<div key={i} className="timeline-item relative">
  {/* Dot — rombo */}
  <div
    className="timeline-dot absolute -left-[1.75rem] top-2 w-3 h-3 bg-accent"
    style={{ transform: 'rotate(45deg)' }}
  />

  <p className="font-mono text-sm text-accent tracking-widest uppercase mb-2">
    {item.year}
  </p>
  <p
    className="font-display text-white uppercase leading-none mb-1"
    style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)' }}
  >
    {item.company}
  </p>
  <p className="font-ui text-off-white text-base font-bold tracking-wide uppercase mb-1">
    {item.role}
  </p>
  <p className="font-ui text-muted text-sm leading-snug line-clamp-3 lg:line-clamp-none">
    {item.description}
  </p>
</div>
```

With:

```tsx
<div key={i} className="timeline-item relative">
  {/* Per-item vertical connector — grows scaleY with scroll */}
  <div
    className="timeline-item-line absolute left-0 top-0 bottom-0 w-0.5 bg-border -translate-x-6"
    style={{ transformOrigin: 'top center', scaleY: 0 } as React.CSSProperties}
  />

  {/* Dot — rombo with ping ring */}
  <div className="absolute -left-[1.75rem] top-2">
    {/* Ping ring — animated via IntersectionObserver */}
    <div
      className="timeline-dot-ping absolute inset-0 w-3 h-3 bg-accent opacity-0"
      style={{ transform: 'rotate(45deg)', animationDuration: '1s' }}
    />
    <div
      className="timeline-dot w-3 h-3 bg-accent"
      style={{ transform: 'rotate(45deg)' }}
    />
  </div>

  <p className="font-mono text-sm text-accent tracking-widest uppercase mb-2">
    {item.year}
  </p>
  <p
    className="font-display text-white uppercase leading-none mb-1"
    style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)' }}
  >
    {item.company}
  </p>
  <div className="overflow-hidden">
    <p className="timeline-role font-ui text-off-white text-base font-bold tracking-wide uppercase mb-1"
      style={{ clipPath: 'inset(0 100% 0 0)' }}>
      {item.role}
    </p>
  </div>
  <p className="font-ui text-muted text-sm leading-snug line-clamp-3 lg:line-clamp-none">
    {item.description}
  </p>
</div>
```

- [ ] **Step 2: Update GSAP animate() to drive per-item lines and role reveals**

Replace the `useEffect` animate function's timeline items section (the part after `const dots = ...`) with:

```typescript
// Per-item vertical lines — scaleY scrub
const itemLines = itemsRef.current.querySelectorAll('.timeline-item-line');
itemLines.forEach((line, idx) => {
  const item = items[idx];
  gsap.fromTo(
    line,
    { scaleY: 0 },
    {
      scaleY: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: item,
        start: 'top 85%',
        end: 'bottom 60%',
        scrub: 1.2,
      },
    }
  );
});

// Role clip-path reveal — horizontal wipe with scrub
const roles = itemsRef.current.querySelectorAll('.timeline-role');
roles.forEach((role, idx) => {
  const item = items[idx];
  gsap.fromTo(
    role,
    { clipPath: 'inset(0 100% 0 0)' },
    {
      clipPath: 'inset(0 0% 0 0)',
      ease: 'none',
      scrollTrigger: {
        trigger: item,
        start: 'top 80%',
        end: 'top 40%',
        scrub: 1.5,
      },
    }
  );
});
```

Keep the existing items fade-left and dots scale animations as they are.

- [ ] **Step 3: Add IntersectionObserver for dot ping in a second useEffect**

Add a new `useEffect` after the existing one in `Experience.tsx`:

```typescript
// Dot ping on enter
useEffect(() => {
  if (typeof window === 'undefined' || window.innerWidth < 1024) return;
  const pings = itemsRef.current?.querySelectorAll('.timeline-dot-ping');
  if (!pings) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          el.style.opacity = '0.6';
          el.classList.add('animate-ping');
          // Remove ping after one cycle so it doesn't loop forever
          setTimeout(() => {
            el.classList.remove('animate-ping');
            el.style.opacity = '0';
          }, 900);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.8 }
  );

  pings.forEach((ping) => observer.observe(ping));
  return () => observer.disconnect();
}, []);
```

- [ ] **Step 4: Verify mobile CSS override still covers new classes**

In `globals.css`, the existing mobile override already includes:
```css
#experience .timeline-item,
#experience .timeline-dot {
  opacity: 1 !important;
  transform: none !important;
}
```

Add `.timeline-item-line` and `.timeline-role` to the mobile override block so they render visible on mobile without animation:

```css
#experience .timeline-item,
#experience .timeline-dot,
#experience .timeline-item-line,
#experience .timeline-role {
  opacity: 1 !important;
  transform: none !important;
  clip-path: none !important;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Experience.tsx src/app/globals.css
git commit -m "feat(experience): per-item scaleY line, clip-path role reveal, dot ping"
```

---

## Task 2: Hero — reverse marquee strip

**Files:**
- Modify: `src/components/sections/Hero.tsx`
- Modify: `src/app/globals.css`

### Context

Hero already has: particle canvas, crossfade photos, scroll indicator at bottom-left. We add a subtle text marquee strip at `bottom-20` on desktop only.

### Steps

- [ ] **Step 1: Add `@keyframes marquee-reverse` to globals.css**

Append before the final `@media (prefers-reduced-motion: reduce)` block:

```css
/* Reverse marquee — Hero section */
@keyframes marquee-reverse {
  from { transform: translateX(-50%); }
  to   { transform: translateX(0); }
}
```

- [ ] **Step 2: Add the marquee strip JSX to Hero.tsx**

Inside `Hero.tsx`, just before the closing `</section>` tag (after the geometric float elements), add:

```tsx
{/* Reverse marquee strip — desktop only, decorative */}
<div
  className="hidden lg:block absolute bottom-20 left-0 right-0 overflow-hidden pointer-events-none"
  style={{ opacity: 0.15 }}
  aria-hidden="true"
>
  <div
    className="flex gap-12 whitespace-nowrap font-mono text-[10px] tracking-[0.3em] uppercase text-muted"
    style={{ animation: 'marquee-reverse 25s linear infinite', width: 'max-content' }}
  >
    {['BIOMEDICAL ENGINEER', 'AI DEVELOPER', 'FOUNDER', 'CLINICAL AI', 'FULL-STACK', 'CÓRDOBA AR'].flatMap((item, i) => [
      <span key={`a${i}`}>{item}</span>,
      <span key={`d${i}`} style={{ color: '#E8272A' }}>·</span>,
    ])}
    {['BIOMEDICAL ENGINEER', 'AI DEVELOPER', 'FOUNDER', 'CLINICAL AI', 'FULL-STACK', 'CÓRDOBA AR'].flatMap((item, i) => [
      <span key={`b${i}`}>{item}</span>,
      <span key={`e${i}`} style={{ color: '#E8272A' }}>·</span>,
    ])}
  </div>
</div>
```

Note: flatMap with JSX arrays requires returning arrays — make sure trailing comma after each `<span>` group is inside the array literal, not after it. The pattern `[item, dot]` per flatMap call produces a flat interleaved array.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/Hero.tsx src/app/globals.css
git commit -m "feat(hero): add reverse marquee decorative strip"
```

---

## Task 3: About — Age counter

**Files:**
- Modify: `src/components/sections/About.tsx`

### Context

`MetricCounter` has `decimals=2` by default and a large font size (`clamp(2rem, 4vw, 3rem)`). For a metadata bar item showing "24" we want: no decimals, small inline size matching the existing metadata bar text, no suffix. The easiest approach: use `MetricCounter` with `decimals={0}` and override its font size via a wrapping `div` with `transform: scale(...)` — but that's ugly. Better: use `MetricCounter` with `decimals={0} suffix="" label=""` and let it render, then note its `font-size: clamp(2rem, 4vw, 3rem)` will be too large for the metadata bar.

Decision: implement a lightweight inline counter directly in About.tsx using a `useRef` + `IntersectionObserver` + `requestAnimationFrame` — same pattern as MetricCounter but inline, producing only a `<span>` that fits the metadata bar text style. This avoids refactoring MetricCounter.

### Steps

- [ ] **Step 1: Add ageCounterRef and ageDisplayRef to About.tsx**

Add these refs at the top of the component (after `subTaglineRef`):

```typescript
const ageDisplayRef = useRef<HTMLSpanElement>(null);
const ageAnimatedRef = useRef(false);
```

- [ ] **Step 2: Add IntersectionObserver for age counter**

Add a new `useEffect` after the existing animate `useEffect`:

```typescript
// Age counter — fires once when metadata bar enters view
useEffect(() => {
  const el = ageDisplayRef.current;
  if (!el) return;

  const target = 24;
  const durationMs = 1200;

  const run = () => {
    if (ageAnimatedRef.current) return;
    ageAnimatedRef.current = true;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = String(target);
    };
    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          run();
          observer.disconnect();
        }
      });
    },
    { threshold: 0.5 }
  );

  observer.observe(el);
  return () => observer.disconnect();
}, []);
```

- [ ] **Step 3: Add Age item to metadata bar JSX**

In `About.tsx`, find the metadata bar div:

```tsx
<div className="mt-6 flex items-center gap-6 border-t border-border pt-4">
  <div>
    <span className="font-mono text-xs text-muted uppercase tracking-widest">Location </span>
    <span className="font-ui text-sm text-off-white">Córdoba, AR</span>
  </div>
  <div className="w-px h-4 bg-border" />
  <div>
    <span className="font-mono text-xs text-muted uppercase tracking-widest">Status </span>
    ...
  </div>
</div>
```

Add after the Status div (before the closing `</div>` of the metadata bar):

```tsx
<div className="w-px h-4 bg-border" />
<div>
  <span className="font-mono text-xs text-muted uppercase tracking-widest">Age </span>
  <span ref={ageDisplayRef} className="font-ui text-sm text-off-white">0</span>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/About.tsx
git commit -m "feat(about): animated age counter in metadata bar"
```

---

## Task 4: Contact — color shift scrub on headline_2

**Files:**
- Modify: `src/components/sections/Contact.tsx`

### Context

Currently `headline_2` ("SOMETHING.") is rendered with inline `color: '#E8272A'` always. We want: it starts as off-white (`#E8E4DE`) and transitions to accent red (`#E8272A`) via GSAP `fromTo` with `scrub` as the section scrolls into view. To do this, GSAP must be able to animate the `color` property. We add a `ref` (`headline2Ref`) to that element and animate `color` from off-white to accent.

Important: GSAP color interpolation requires the Color plugin OR we use `gsap.fromTo` with the raw hex values — GSAP 3 handles hex color strings natively without extra plugins.

### Steps

- [ ] **Step 1: Add headline2Ref**

In `Contact.tsx`, add after `const contentRef`:

```typescript
const headline2Ref = useRef<HTMLDivElement>(null);
```

- [ ] **Step 2: Add color shift animation inside animate()**

Inside the `animate()` function, after the existing `headlineRef` block and before `if (contentRef.current)`:

```typescript
// headline_2 color shift — off-white to accent red with scrub
if (headline2Ref.current) {
  gsap.fromTo(
    headline2Ref.current,
    { color: '#E8E4DE' },
    {
      color: '#E8272A',
      ease: 'none',
      scrollTrigger: {
        trigger: headline2Ref.current,
        start: 'top bottom',
        end: 'top 40%',
        scrub: 2,
      },
    }
  );
}
```

- [ ] **Step 3: Attach ref to headline_2 div and remove static color inline style**

Find the headline_2 div:

```tsx
<div
  className="headline-line font-display uppercase leading-none"
  style={{
    fontSize: 'clamp(2.8rem, 13vw, 11rem)',
    color: '#E8272A',
  }}
>
  {t('headline_2')}
</div>
```

Replace with (add `ref`, change initial `color` to off-white so GSAP animates it in — on mobile it will be overridden by the CSS mobile rule):

```tsx
<div
  ref={headline2Ref}
  className="headline-line font-display uppercase leading-none"
  style={{
    fontSize: 'clamp(2.8rem, 13vw, 11rem)',
    color: '#E8E4DE',
  }}
>
  {t('headline_2')}
</div>
```

- [ ] **Step 4: Ensure mobile shows the correct accent color**

The mobile CSS override resets `#contact .headline-line` — but it doesn't set `color`. Add a mobile color rule in `globals.css`:

```css
/* Contact headline_2 — force accent on mobile (GSAP color shift skipped) */
@media (max-width: 1023px) {
  #contact .headline-line:last-child {
    color: #E8272A !important;
  }
}
```

This targets the second `.headline-line` (the red one) specifically on mobile.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Contact.tsx src/app/globals.css
git commit -m "feat(contact): scrub-driven color shift on SOMETHING headline"
```

---

## Task 5: Skills marquee — pause on hover

**Files:**
- Modify: `src/components/sections/Skills.tsx`
- Modify: `src/app/globals.css`

### Context

The marquee container div wraps the animated content. We add class names `marquee-container` to the outer wrapper and `marquee-content` to the inner animated div, then add a CSS hover rule.

### Steps

- [ ] **Step 1: Add CSS hover rule to globals.css**

Append to `globals.css` (before the final `@media (prefers-reduced-motion: reduce)` rule):

```css
/* Skills marquee — pause on hover */
.marquee-container:hover .marquee-content {
  animation-play-state: paused;
}
```

- [ ] **Step 2: Add class names in Skills.tsx**

Find the marquee wrapper:

```tsx
<div className="relative overflow-hidden mb-8 lg:mb-16 border-y border-border py-3">
  <div
    className="flex gap-8 whitespace-nowrap"
    style={{ animation: 'marquee 30s linear infinite', width: 'max-content' }}
  >
```

Replace with:

```tsx
<div className="marquee-container relative overflow-hidden mb-8 lg:mb-16 border-y border-border py-3">
  <div
    className="marquee-content flex gap-8 whitespace-nowrap"
    style={{ animation: 'marquee 30s linear infinite', width: 'max-content' }}
  >
```

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/Skills.tsx src/app/globals.css
git commit -m "feat(skills): pause marquee on hover"
```

---

## Task 6: Build verification

**Files:** none

- [ ] **Step 1: Run build**

```powershell
Set-Location "C:\Users\juanp\AGENCIA DIGITAL\projects\jpr-web"
npm run build
```

Expected output: `✓ Compiled successfully` with 0 TypeScript errors. Route list printed, no `Type error:` lines.

- [ ] **Step 2: Fix any TypeScript errors found**

Common issues:
- `React.CSSProperties` doesn't support `scaleY` as a direct style prop — use a GSAP `set()` call instead of inline style for the `scaleY: 0` initial state on `.timeline-item-line`.
- If `flatMap` with JSX returns produce TS errors, explicitly type the return as `JSX.Element[]`.

- [ ] **Step 3: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: TypeScript cleanup after animation improvements"
```

---

## Self-Review

**Spec coverage check:**

1. Experience scaleY per-item line — Task 1 ✓
2. Experience dot ping — Task 1 ✓
3. Experience role clip-path reveal — Task 1 ✓
4. Hero reverse marquee — Task 2 ✓
5. About age counter — Task 3 ✓
6. Contact color shift scrub — Task 4 ✓
7. Skills marquee pause on hover — Task 5 ✓
8. Mobile skip for GSAP scrub — all tasks specify mobile guard ✓
9. No pin — no ScrollTrigger pin used anywhere ✓
10. Async GSAP import pattern — Task 1, 4 use it ✓

**Placeholder scan:** No TBDs, no "fill in later". All code blocks are complete.

**Type consistency:**
- `ageDisplayRef` is `useRef<HTMLSpanElement>` — used as `ref={ageDisplayRef}` on a `<span>` ✓
- `headline2Ref` is `useRef<HTMLDivElement>` — used on a `<div>` ✓
- `timeline-item-line` / `timeline-dot-ping` / `timeline-role` — class names consistent between JSX and GSAP selectors ✓

**Potential issue — Task 1 Step 1:** The inline `style={{ ..., scaleY: 0 } as React.CSSProperties}` — `scaleY` is not a standard CSSProperty and TypeScript will complain. Fix: remove `scaleY: 0` from the inline style and instead set it via GSAP in the animate function:

```typescript
// At start of animate(), before any fromTo — set initial state
const itemLines = itemsRef.current?.querySelectorAll('.timeline-item-line');
if (itemLines) gsap.set(itemLines, { scaleY: 0 });
```

This is already the correct approach. The plan's Step 1 should NOT include `scaleY: 0` in the JSX style — remove it from the JSX. The GSAP `fromTo` in Step 2 handles the initial state via its first argument.

**Corrected Task 1 Step 1 timeline-item-line div:**

```tsx
{/* Per-item vertical connector — grows scaleY with scroll */}
<div
  className="timeline-item-line absolute left-0 top-0 bottom-0 w-0.5 bg-border -translate-x-6"
  style={{ transformOrigin: 'top center' }}
/>
```

The `scaleY: 0` initial state is set by GSAP `fromTo`'s first tween argument.
