import Lenis from 'lenis';

// Плавная прокрутка на весь сайт. Отключается, если человек попросил систему «уменьшить движение».
let lenis: Lenis | null = null;

export const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function startSmooth() {
  if (lenis || reducedMotion()) return;
  lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), touchMultiplier: 1.4 });
  const raf = (time: number) => {
    lenis?.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

/** Прокрутить к якорю (#works) — плавно, с учётом шапки */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -10, duration: 1.6 });
  else el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
}

/** Остановить прокрутку страницы (открыто окно) и вернуть обратно */
export function lockScroll(lock: boolean) {
  if (lenis) (lock ? lenis.stop() : lenis.start());
  document.documentElement.style.overflow = lock ? 'hidden' : '';
}

export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { duration: 1.8 });
  else window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
}
