export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Frame-rate independent damping factor. */
export const damp = (lambda: number, dt: number) => 1 - Math.exp(-lambda * dt);

export function isSmallScreen() {
  return Math.min(window.innerWidth, window.innerHeight) < 720 || !finePointer.matches;
}

export function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Runs `onChange(visible)` whenever the element enters or leaves the viewport or the tab is hidden. */
export function watchVisibility(el: Element, onChange: (visible: boolean) => void, rootMargin = '0px') {
  let inView = false;
  const emit = () => onChange(inView && !document.hidden);
  const io = new IntersectionObserver(
    (entries) => {
      inView = entries[entries.length - 1]?.isIntersecting ?? false;
      emit();
    },
    { rootMargin },
  );
  io.observe(el);
  document.addEventListener('visibilitychange', emit);
  return () => {
    io.disconnect();
    document.removeEventListener('visibilitychange', emit);
  };
}
