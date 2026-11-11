import { reducedMotion, supportsWebGL } from './env';
import { initMotion } from './motion';

initMotion();
(window as Window & { __motionReady?: boolean }).__motionReady = true;

const hero = document.querySelector<HTMLElement>('[data-hero]');
const canvas = hero?.querySelector<HTMLCanvasElement>('[data-hero-canvas]');

if (hero && canvas) {
  const fail = () => hero.classList.add('no-webgl');
  if (!supportsWebGL()) {
    fail();
  } else {
    // three.js is loaded on its own chunk so the text paints first.
    import('./hero-scene')
      .then(({ mountHeroScene }) => {
        mountHeroScene(hero, canvas, { reducedMotion: reducedMotion.matches, onFail: fail });
        requestAnimationFrame(() => hero.classList.add('is-ready'));
      })
      .catch(fail);
  }
}
