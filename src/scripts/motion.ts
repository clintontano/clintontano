import { clamp, finePointer, reducedMotion } from './env';

/** Fade-and-rise reveals as blocks enter the viewport. */
function initReveals() {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  targets.forEach((el) => io.observe(el));
}

/** Mobile menu overlay, plus the current section marker in the desktop nav. */
function initMenu() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = document.querySelector<HTMLElement>('[data-menu]');
  if (toggle && menu) {
    const label = toggle.querySelector('.menu-toggle__text');
    const set = (open: boolean) => {
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? 'Close' : 'Menu';
    };
    toggle.addEventListener('click', () => set(!document.body.classList.contains('menu-open')));
    menu.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('a')) set(false);
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') set(false);
    });
    window.matchMedia('(min-width: 861px)').addEventListener('change', (event) => {
      if (event.matches) set(false);
    });
  }

  const links = new Map<string, HTMLAnchorElement>();
  document.querySelectorAll<HTMLAnchorElement>('.site-nav a[href^="#"]').forEach((a) => {
    links.set(a.hash.slice(1), a);
  });
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const link = links.get(entry.target.id);
        if (!link) continue;
        if (entry.isIntersecting) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  links.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) io.observe(section);
  });
}

/** Words in the opening statement darken as you read down the page. */
function initWords(): (() => void) | undefined {
  const el = document.querySelector<HTMLElement>('[data-words]');
  if (!el) return;

  const words = (el.textContent ?? '').trim().split(/\s+/);
  // Screen readers get the sentence whole; the per-word spans are presentation only.
  const full = document.createElement('span');
  full.className = 'visually-hidden';
  full.textContent = words.join(' ');
  el.textContent = '';
  el.append(full);
  const spans = words.map((word, i) => {
    const span = document.createElement('span');
    span.className = 'w';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = word;
    el.append(span, i < words.length - 1 ? ' ' : '');
    return span;
  });

  if (reducedMotion.matches) {
    spans.forEach((span) => span.classList.add('is-on'));
    return;
  }

  let lit = -1;
  return () => {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const progress = clamp((vh * 0.82 - rect.top) / (rect.height + vh * 0.25));
    const next = Math.round(progress * spans.length);
    if (next === lit) return;
    lit = next;
    spans.forEach((span, i) => span.classList.toggle('is-on', i < lit));
  };
}

/** Subtle vertical drift for framed images. */
function initParallax(): (() => void) | undefined {
  const items = [...document.querySelectorAll<HTMLElement>('[data-parallax]')];
  if (!items.length || reducedMotion.matches) return;

  return () => {
    const vh = window.innerHeight;
    for (const el of items) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > vh + 100) continue;
      el.style.setProperty('--parallax', clamp((vh - rect.top) / (vh + rect.height)).toFixed(4));
    }
  };
}

/** Lays the closing line of type out around a circle in 3D. */
function initRing() {
  const ring = document.querySelector<HTMLElement>('[data-ring]');
  if (!ring) return;

  const chars = [...`${(ring.textContent ?? '').replace(/\s+/g, ' ').trim()} `];
  const step = 360 / chars.length;
  const build = (modifier: string) => {
    const spin = document.createElement('div');
    spin.className = `ring__spin ${modifier}`;
    chars.forEach((char, i) => {
      const span = document.createElement('span');
      span.className = 'ring__ch';
      span.style.setProperty('--a', `${(i * step).toFixed(3)}deg`);
      span.textContent = char === ' ' ? ' ' : char;
      spin.append(span);
    });
    return spin;
  };
  ring.textContent = '';
  ring.append(build('ring__spin--back'), build('ring__spin--front'));

  const size = () => {
    const radius = window.innerWidth <= 700 ? window.innerWidth * 0.62 : Math.min(window.innerWidth * 0.44, 560);
    const fontSize = ((2 * Math.PI * radius) / chars.length) * 0.92;
    ring.style.setProperty('--fs', `${Math.max(12, fontSize).toFixed(1)}px`);
  };
  size();
  window.addEventListener('resize', size, { passive: true });
}

/** Cards and plates lean towards the pointer; inner layers sit at different depths. */
function initTilt() {
  if (reducedMotion.matches || !finePointer.matches) return;

  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((card) => {
    const target =
      card.querySelector<HTMLElement>('[data-tilt-target]') ?? card.querySelector<HTMLElement>('.stage__art') ?? card;
    card.addEventListener('pointermove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      target.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`);
      target.style.setProperty('--rx', `${(-y * 12).toFixed(2)}deg`);
    });
    card.addEventListener('pointerleave', () => {
      target.style.removeProperty('--ry');
      target.style.removeProperty('--rx');
    });
  });
}

/** Touch screens have no hover, so flip the plate nearest the middle of the screen instead. */
function initTouchStages() {
  if (finePointer.matches || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => entries.forEach((entry) => entry.target.classList.toggle('is-active', entry.isIntersecting)),
    { rootMargin: '-40% 0px -40% 0px' },
  );
  document.querySelectorAll('.stage').forEach((stage) => io.observe(stage));
}

function initAccraTime() {
  const el = document.querySelector<HTMLElement>('[data-accra-time]');
  if (!el) return;

  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const tick = () => {
    el.textContent = `${format.format(new Date())} GMT`;
  };
  tick();
  window.setInterval(tick, 15_000);
}

export function initMotion() {
  initReveals();
  initMenu();
  initRing();
  initTilt();
  initTouchStages();
  initAccraTime();

  // Scroll-linked work shares one rAF-throttled listener.
  const onScroll = [initWords(), initParallax()].filter((fn): fn is () => void => Boolean(fn));
  if (!onScroll.length) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    onScroll.forEach((fn) => fn());
  };
  const request = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
  update();
}
